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

describe('Course Management, Curriculum Ordering, Ownership & Moderation API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('auto-seeds default categories and restricts category creation to administrators', async () => {
    const listRes = await request(app).get('/api/v1/categories');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.categories.length).toBeGreaterThanOrEqual(5);

    const { token: instructorToken } = await createTestUser(
      'Inst One',
      'inst1@learnsphere.test',
      'instructor'
    );
    const { token: adminToken } = await createTestUser(
      'Admin User',
      'admin@learnsphere.test',
      'admin'
    );

    const forbiddenRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ name: 'Mobile Engineering', description: 'iOS and Android' });
    expect(forbiddenRes.status).toBe(403);

    const createRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Mobile Engineering', description: 'iOS and Android' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.category.slug).toBe('mobile-engineering');
  });

  it('allows instructor to create draft course, build/reorder curriculum, and prevents IDOR by another instructor', async () => {
    const catRes = await request(app).get('/api/v1/categories');
    const categoryId = catRes.body.data.categories[0]._id as string;

    const { token: studentToken } = await createTestUser(
      'Student User',
      'student@learnsphere.test',
      'student'
    );
    const { token: instructorAToken } = await createTestUser(
      'Instructor A',
      'insta@learnsphere.test',
      'instructor'
    );
    const { token: instructorBToken } = await createTestUser(
      'Instructor B',
      'instb@learnsphere.test',
      'instructor'
    );

    // Student cannot create course
    const studentAttempt = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Unauthorized Course',
        shortDescription: 'Should be blocked by RBAC',
        category: categoryId,
      });
    expect(studentAttempt.status).toBe(403);

    // Instructor A creates draft course
    const createRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({
        title: 'Distributed Systems in TypeScript',
        shortDescription: 'Architect resilient backend systems from scratch.',
        fullDescription: 'Deep dive into consensus, queues, and idempotency.',
        category: categoryId,
        level: 'advanced',
        price: 49,
        tags: ['typescript', 'backend'],
        prerequisites: ['Node.js basics'],
        learningObjectives: ['Design fault-tolerant services'],
      });

    expect(createRes.status).toBe(201);
    const courseId = createRes.body.data.course._id as string;
    expect(createRes.body.data.course.status).toBe('draft');

    // Submitting empty course for review fails
    const emptySubmit = await request(app)
      .post(`/api/v1/courses/${courseId}/submit-review`)
      .set('Authorization', `Bearer ${instructorAToken}`);
    expect(emptySubmit.status).toBe(400);

    // Instructor B attempts IDOR update on Instructor A's course
    const idorAttempt = await request(app)
      .patch(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${instructorBToken}`)
      .send({ title: 'Hijacked Course Title' });
    expect(idorAttempt.status).toBe(403);

    // Instructor A adds two sections
    const sec1Res = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({ title: 'Module 1: Foundations' });
    expect(sec1Res.status).toBe(201);
    const sec1Id = sec1Res.body.data.section._id as string;

    const sec2Res = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({ title: 'Module 2: Replication' });
    expect(sec2Res.status).toBe(201);
    const sec2Id = sec2Res.body.data.section._id as string;

    // Reorder sections (Module 2 before Module 1)
    const reorderSecRes = await request(app)
      .patch(`/api/v1/courses/${courseId}/sections/reorder`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({ orderedSectionIds: [sec2Id, sec1Id] });
    expect(reorderSecRes.status).toBe(200);
    expect(reorderSecRes.body.data.sections[0]._id).toBe(sec2Id);
    expect(reorderSecRes.body.data.sections[0].order).toBe(0);

    // Add two lessons to Section 1 (one preview, one protected)
    const les1Res = await request(app)
      .post(`/api/v1/courses/${courseId}/sections/${sec1Id}/lessons`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({
        title: 'Course Welcome & Architecture',
        type: 'video',
        videoUrl: 'https://cdn.learnsphere.test/welcome.mp4',
        videoDurationSeconds: 600,
        isPreview: true,
      });
    expect(les1Res.status).toBe(201);

    const les2Res = await request(app)
      .post(`/api/v1/courses/${courseId}/sections/${sec1Id}/lessons`)
      .set('Authorization', `Bearer ${instructorAToken}`)
      .send({
        title: 'Raft Consensus Deep Dive',
        type: 'text',
        content: '# Secret Raft Notes',
        videoDurationSeconds: 1200,
        isPreview: false,
      });
    expect(les2Res.status).toBe(201);

    // Verify course metrics updated
    const editorRes = await request(app)
      .get(`/api/v1/courses/${courseId}/editor`)
      .set('Authorization', `Bearer ${instructorAToken}`);
    expect(editorRes.status).toBe(200);
    expect(editorRes.body.data.course.totalLessonsCount).toBe(2);
    expect(editorRes.body.data.course.estimatedDurationMinutes).toBe(30);
  });

  it('executes full review lifecycle (draft -> pending_review -> rejected -> pending_review -> published) and sanitizes public curriculum', async () => {
    const catRes = await request(app).get('/api/v1/categories');
    const categoryId = catRes.body.data.categories[0]._id as string;

    const { token: instructorToken } = await createTestUser(
      'Instructor Pro',
      'pro@learnsphere.test',
      'instructor'
    );
    const { token: adminToken } = await createTestUser(
      'Platform Admin',
      'admin@learnsphere.test',
      'admin'
    );

    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Modern React & TanStack Query',
        shortDescription: 'Build production frontend applications with TypeScript.',
        category: categoryId,
        level: 'intermediate',
        price: 0,
      });
    const courseId = courseRes.body.data.course._id as string;
    const courseSlug = courseRes.body.data.course.slug as string;

    const secRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Getting Started' });
    const sectionId = secRes.body.data.section._id as string;

    await request(app)
      .post(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Free Preview Lesson',
        type: 'video',
        videoUrl: 'https://cdn.learnsphere.test/preview.mp4',
        isPreview: true,
      });

    await request(app)
      .post(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Enrolled-Only Lesson',
        type: 'video',
        videoUrl: 'https://cdn.learnsphere.test/protected.mp4',
        content: 'Protected lesson body',
        isPreview: false,
      });

    // Submit for review
    const submitRes = await request(app)
      .post(`/api/v1/courses/${courseId}/submit-review`)
      .set('Authorization', `Bearer ${instructorToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.course.status).toBe('pending_review');

    // Admin rejects with feedback
    const rejectRes = await request(app)
      .patch(`/api/v1/courses/${courseId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'reject',
        rejectionReason: 'Please add clearer learning objectives before publication.',
      });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.course.status).toBe('rejected');
    expect(rejectRes.body.data.course.rejectionReason).toContain(
      'learning objectives'
    );

    // Resubmit and Admin approves
    await request(app)
      .post(`/api/v1/courses/${courseId}/submit-review`)
      .set('Authorization', `Bearer ${instructorToken}`);

    const approveRes = await request(app)
      .patch(`/api/v1/courses/${courseId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.course.status).toBe('published');

    // Public catalog lists the published course
    const catalogRes = await request(app).get(
      '/api/v1/courses?q=TanStack&priceType=free'
    );
    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.data.courses).toHaveLength(1);

    // Unauthenticated detail view exposes preview videoUrl but strips non-preview videoUrl
    const detailRes = await request(app).get(`/api/v1/courses/${courseSlug}`);
    expect(detailRes.status).toBe(200);
    const lessons = detailRes.body.data.sections[0].lessons;
    expect(lessons).toHaveLength(2);
    expect(lessons[0].isPreview).toBe(true);
    expect(lessons[0].videoUrl).toBe('https://cdn.learnsphere.test/preview.mp4');
    expect(lessons[1].isPreview).toBe(false);
    expect(lessons[1].videoUrl).toBeUndefined();
    expect(lessons[1].content).toBeUndefined();
  });
});
