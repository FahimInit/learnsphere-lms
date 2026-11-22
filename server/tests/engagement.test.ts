import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { User, hashPassword } from '../src/modules/users/user.model';
import { signAccessToken } from '../src/utils/jwt';
import { setupTestDB, clearTestDB, teardownTestDB } from './setupTestDB';

async function createTestUser(
  name: string,
  email: string,
  role: 'student' | 'instructor' | 'admin'
) {
  const passwordHash = await hashPassword('Password123');
  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    status: 'active',
  });
  const token = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  });
  return { user, token };
}

async function setupPublishedCourse() {
  const { token: instructorToken } = await createTestUser(
    'Inst Author',
    'author@learnsphere.test',
    'instructor'
  );
  const { token: adminToken } = await createTestUser(
    'Platform Admin',
    'admin@learnsphere.test',
    'admin'
  );
  const { token: student1Token } = await createTestUser(
    'Student One',
    'student1@learnsphere.test',
    'student'
  );
  const { token: student2Token } = await createTestUser(
    'Student Two',
    'student2@learnsphere.test',
    'student'
  );
  const { token: outsiderToken } = await createTestUser(
    'Outsider User',
    'outsider@learnsphere.test',
    'student'
  );

  const catRes = await request(app).get('/api/v1/categories');
  const categoryId = catRes.body.data.categories[0]._id as string;

  const courseRes = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: 'Distributed Node.js & WebSockets',
      shortDescription: 'Real-time communication patterns and community tools.',
      category: categoryId,
    });
  const courseId = courseRes.body.data.course._id as string;

  const secRes = await request(app)
    .post(`/api/v1/courses/${courseId}/sections`)
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({ title: 'Module 1' });
  const sectionId = secRes.body.data.section._id as string;

  await request(app)
    .post(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons`)
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: 'Socket.IO Rooms',
      type: 'text',
      content: 'Joining user and course rooms',
    });

  await request(app)
    .post(`/api/v1/courses/${courseId}/submit-review`)
    .set('Authorization', `Bearer ${instructorToken}`);

  await request(app)
    .patch(`/api/v1/courses/${courseId}/moderate`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ action: 'approve' });

  await request(app)
    .post(`/api/v1/enrollments/courses/${courseId}`)
    .set('Authorization', `Bearer ${student1Token}`);

  await request(app)
    .post(`/api/v1/enrollments/courses/${courseId}`)
    .set('Authorization', `Bearer ${student2Token}`);

  return {
    courseId,
    instructorToken,
    student1Token,
    student2Token,
    outsiderToken,
  };
}

describe('Engagement System: Discussions, Announcements & Real-Time Notifications', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('delivers notifications on course approval and enrollment, enforces IDOR on read status, and supports mark-all-read', async () => {
    const { instructorToken, student1Token, student2Token } =
      await setupPublishedCourse();

    // Instructor received course approval notification
    const instNotifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(instNotifs.status).toBe(200);
    expect(instNotifs.body.data.unreadCount).toBeGreaterThanOrEqual(1);
    expect(
      instNotifs.body.data.notifications.some(
        (n: { type: string }) => n.type === 'course_status'
      )
    ).toBe(true);

    // Student 1 received enrollment notification
    const s1Notifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${student1Token}`);
    expect(s1Notifs.status).toBe(200);
    expect(s1Notifs.body.data.unreadCount).toBe(1);
    const notifId = s1Notifs.body.data.notifications[0]._id as string;

    // IDOR check: Student 2 cannot mark Student 1's notification as read
    const idorRead = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${student2Token}`);
    expect(idorRead.status).toBe(403);

    // Student 1 marks notification read
    const markOne = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${student1Token}`);
    expect(markOne.status).toBe(200);
    expect(markOne.body.data.notification.isRead).toBe(true);

    // Mark all read clears unreadCount
    const markAll = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(markAll.status).toBe(200);

    const instAfter = await request(app)
      .get('/api/v1/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(instAfter.body.data.unreadCount).toBe(0);
    expect(instAfter.body.data.notifications).toHaveLength(0);
  });

  it('supports threaded discussions, instructor reply badges, pinning, content reporting, and bulk announcement notifications', async () => {
    const {
      courseId,
      instructorToken,
      student1Token,
      student2Token,
      outsiderToken,
    } = await setupPublishedCourse();

    // Unenrolled outsider cannot access community
    const blockedList = await request(app)
      .get(`/api/v1/discussions/course/${courseId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(blockedList.status).toBe(403);

    // Student 1 creates a discussion thread
    const createThread = await request(app)
      .post(`/api/v1/discussions/course/${courseId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        title: 'How do Socket.IO rooms scale across multiple nodes?',
        content: 'Should we use the Redis adapter in production?',
      });
    expect(createThread.status).toBe(201);
    const discussionId = createThread.body.data.discussion._id as string;

    // Instructor replies to the thread (gets isInstructorReply: true)
    const instReply = await request(app)
      .post(`/api/v1/discussions/${discussionId}/comments`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        content: 'Yes! Use @socket.io/redis-adapter to broadcast across instances.',
      });
    expect(instReply.status).toBe(201);
    expect(instReply.body.data.comment.isInstructorReply).toBe(true);
    const commentId = instReply.body.data.comment._id as string;

    // Student 1 received a discussion_reply notification
    const s1Notifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${student1Token}`);
    expect(
      s1Notifs.body.data.notifications.some(
        (n: { type: string }) => n.type === 'discussion_reply'
      )
    ).toBe(true);

    // Instructor pins and resolves the thread
    const pinRes = await request(app)
      .patch(`/api/v1/discussions/${discussionId}/status`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ isPinned: true, isResolved: true });
    expect(pinRes.status).toBe(200);
    expect(pinRes.body.data.discussion.isPinned).toBe(true);
    expect(pinRes.body.data.discussion.isResolved).toBe(true);

    // Student 2 reports a comment for moderation
    const reportRes = await request(app)
      .post(`/api/v1/discussions/comments/${commentId}/report`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ reason: 'Testing content moderation flag workflow' });
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.data.comment.isReported).toBe(true);

    // Instructor posts a course announcement -> notifies both enrolled students
    const announceRes = await request(app)
      .post(`/api/v1/discussions/course/${courseId}/announcements`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Live Q&A Session Tomorrow',
        content: 'Join us at 6 PM UTC for a live architecture walkthrough.',
      });
    expect(announceRes.status).toBe(201);

    const s2Notifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${student2Token}`);
    expect(
      s2Notifs.body.data.notifications.some(
        (n: { type: string; title: string }) =>
          n.type === 'announcement' &&
          n.title.includes('Live Q&A Session Tomorrow')
      )
    ).toBe(true);

    // Community listing returns both pinned discussion and announcement
    const communityRes = await request(app)
      .get(`/api/v1/discussions/course/${courseId}`)
      .set('Authorization', `Bearer ${student1Token}`);
    expect(communityRes.status).toBe(200);
    expect(communityRes.body.data.discussions).toHaveLength(1);
    expect(communityRes.body.data.announcements).toHaveLength(1);
  });
});
