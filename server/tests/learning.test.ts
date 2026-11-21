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

async function createPublishedCourseWithTwoLessons(
  instructorToken: string,
  adminToken: string
) {
  const catRes = await request(app).get('/api/v1/categories');
  const categoryId = catRes.body.data.categories[0]._id as string;

  const courseRes = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: 'Production Node.js & MongoDB',
      shortDescription: 'Master backend engineering with real-world patterns.',
      category: categoryId,
      level: 'intermediate',
      price: 0,
    });
  const courseId = courseRes.body.data.course._id as string;

  const secRes = await request(app)
    .post(`/api/v1/courses/${courseId}/sections`)
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({ title: 'Module 1: Core Architecture' });
  const sectionId = secRes.body.data.section._id as string;

  const les1Res = await request(app)
    .post(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons`)
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: 'Lesson 1: Event Loop & Streams',
      type: 'video',
      videoUrl: 'https://cdn.learnsphere.test/lesson1.mp4',
      videoDurationSeconds: 600,
      isPreview: false,
    });
  const lesson1Id = les1Res.body.data.lesson._id as string;

  const les2Res = await request(app)
    .post(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons`)
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: 'Lesson 2: Compound Indexes & Aggregations',
      type: 'text',
      content: '# Indexing Deep Dive',
      videoDurationSeconds: 900,
      isPreview: false,
    });
  const lesson2Id = les2Res.body.data.lesson._id as string;

  await request(app)
    .post(`/api/v1/courses/${courseId}/submit-review`)
    .set('Authorization', `Bearer ${instructorToken}`);

  await request(app)
    .patch(`/api/v1/courses/${courseId}/moderate`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ action: 'approve' });

  return { courseId, sectionId, lesson1Id, lesson2Id };
}

describe('Student Enrollment, Learning Workspace, Progress Tracking & Reviews API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('enrolls student in published course, prevents duplicate enrollment, and blocks unenrolled access', async () => {
    const { token: instructorToken } = await createTestUser(
      'Inst Author',
      'author@learnsphere.test',
      'instructor'
    );
    const { token: adminToken } = await createTestUser(
      'Admin User',
      'admin@learnsphere.test',
      'admin'
    );
    const { token: studentAToken } = await createTestUser(
      'Student A',
      'studenta@learnsphere.test',
      'student'
    );
    const { token: studentBToken } = await createTestUser(
      'Student B',
      'studentb@learnsphere.test',
      'student'
    );

    const { courseId, lesson1Id } = await createPublishedCourseWithTwoLessons(
      instructorToken,
      adminToken
    );

    // Unenrolled Student B cannot access learning workspace or mark progress
    const blockedLearn = await request(app)
      .get(`/api/v1/enrollments/courses/${courseId}/learn`)
      .set('Authorization', `Bearer ${studentBToken}`);
    expect(blockedLearn.status).toBe(403);

    const blockedProgress = await request(app)
      .post(`/api/v1/progress/lessons/${lesson1Id}/toggle`)
      .set('Authorization', `Bearer ${studentBToken}`);
    expect(blockedProgress.status).toBe(403);

    // Student A enrolls
    const enrollRes = await request(app)
      .post(`/api/v1/enrollments/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(enrollRes.status).toBe(201);
    expect(enrollRes.body.data.enrollment.status).toBe('active');
    expect(enrollRes.body.data.enrollment.progressPercentage).toBe(0);
    expect(enrollRes.body.data.enrollment.lastAccessedLesson._id).toBe(
      lesson1Id
    );

    // Duplicate enrollment is rejected with 409 CONFLICT
    const dupEnroll = await request(app)
      .post(`/api/v1/enrollments/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(dupEnroll.status).toBe(409);
  });

  it('tracks lesson progress deterministically (0% -> 50% -> 100% completed), persists notes, and updates resume lesson', async () => {
    const { token: instructorToken } = await createTestUser(
      'Inst Author',
      'author@learnsphere.test',
      'instructor'
    );
    const { token: adminToken } = await createTestUser(
      'Admin User',
      'admin@learnsphere.test',
      'admin'
    );
    const { token: studentToken } = await createTestUser(
      'Learner One',
      'learner@learnsphere.test',
      'student'
    );

    const { courseId, lesson1Id, lesson2Id } =
      await createPublishedCourseWithTwoLessons(instructorToken, adminToken);

    await request(app)
      .post(`/api/v1/enrollments/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    // Mark Lesson 1 complete -> 50%
    const toggle1 = await request(app)
      .post(`/api/v1/progress/lessons/${lesson1Id}/toggle`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ isCompleted: true });

    expect(toggle1.status).toBe(200);
    expect(toggle1.body.data.enrollment.progressPercentage).toBe(50);
    expect(toggle1.body.data.enrollment.completedLessonsCount).toBe(1);
    expect(toggle1.body.data.enrollment.status).toBe('active');

    // Save personal notes and playback position on Lesson 2
    const stateRes = await request(app)
      .patch(`/api/v1/progress/lessons/${lesson2Id}/state`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        notes: 'Remember ESR rule: Equality, Sort, Range for compound indexes',
        lastPositionSeconds: 185,
        watchTimeDeltaSeconds: 185,
      });
    expect(stateRes.status).toBe(200);
    expect(stateRes.body.data.lessonProgress.notes).toContain('ESR rule');

    // Verify Learning Workspace returns unredacted lessons, progressMap, and resumeLessonId === lesson2Id
    const workspaceRes = await request(app)
      .get(`/api/v1/enrollments/courses/${courseId}/learn`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(workspaceRes.status).toBe(200);
    expect(workspaceRes.body.data.resumeLessonId).toBe(lesson2Id);
    expect(
      workspaceRes.body.data.progressMap[lesson1Id].isCompleted
    ).toBe(true);
    expect(workspaceRes.body.data.progressMap[lesson2Id].notes).toContain(
      'ESR rule'
    );
    expect(
      workspaceRes.body.data.sections[0].lessons[0].videoUrl
    ).toBe('https://cdn.learnsphere.test/lesson1.mp4');

    // Mark Lesson 2 complete -> 100% and enrollment status transitions to 'completed'
    const toggle2 = await request(app)
      .post(`/api/v1/progress/lessons/${lesson2Id}/toggle`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ isCompleted: true });

    expect(toggle2.status).toBe(200);
    expect(toggle2.body.data.enrollment.progressPercentage).toBe(100);
    expect(toggle2.body.data.enrollment.status).toBe('completed');
    expect(toggle2.body.data.enrollment.completedAt).toBeDefined();
  });

  it('allows enrolled students to rate and review courses and recalculates averageRating', async () => {
    const { token: instructorToken } = await createTestUser(
      'Inst Author',
      'author@learnsphere.test',
      'instructor'
    );
    const { token: adminToken } = await createTestUser(
      'Admin User',
      'admin@learnsphere.test',
      'admin'
    );
    const { token: student1Token } = await createTestUser(
      'Student 1',
      's1@learnsphere.test',
      'student'
    );
    const { token: student2Token } = await createTestUser(
      'Student 2',
      's2@learnsphere.test',
      'student'
    );

    const { courseId } = await createPublishedCourseWithTwoLessons(
      instructorToken,
      adminToken
    );

    // Unenrolled Student 1 cannot submit review
    const forbiddenReview = await request(app)
      .post(`/api/v1/courses/${courseId}/reviews`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ rating: 5, comment: 'Trying to review without enrolling' });
    expect(forbiddenReview.status).toBe(403);

    // Both students enroll and submit reviews (5 and 4 -> average 4.5)
    await request(app)
      .post(`/api/v1/enrollments/courses/${courseId}`)
      .set('Authorization', `Bearer ${student1Token}`);
    await request(app)
      .post(`/api/v1/enrollments/courses/${courseId}`)
      .set('Authorization', `Bearer ${student2Token}`);

    const rev1 = await request(app)
      .post(`/api/v1/courses/${courseId}/reviews`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        rating: 5,
        comment: 'Outstanding explanation of MongoDB compound indexes!',
      });
    expect(rev1.status).toBe(201);
    expect(rev1.body.data.course.averageRating).toBe(5);
    expect(rev1.body.data.course.reviewCount).toBe(1);

    const rev2 = await request(app)
      .post(`/api/v1/courses/${courseId}/reviews`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        rating: 4,
        comment: 'Very practical backend patterns.',
      });
    expect(rev2.status).toBe(201);
    expect(rev2.body.data.course.averageRating).toBe(4.5);
    expect(rev2.body.data.course.reviewCount).toBe(2);
  });
});
