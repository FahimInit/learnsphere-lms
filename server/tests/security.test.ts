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

describe('Security Audit Regression Suite', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('prevents query-string object injection 500 crashes and strips instructor email from public course details', async () => {
    const qsInjectionRes = await request(app).get('/api/v1/courses?q[$ne]=x');
    expect(qsInjectionRes.status).toBe(400);
    expect(qsInjectionRes.body.error.code).toBe('VALIDATION_ERROR');

    const { token: instructorToken } = await createTestUser(
      'Public Inst',
      'private.instructor@learnsphere.test',
      'instructor'
    );
    const { token: adminToken } = await createTestUser(
      'Admin Sec',
      'admin.sec@learnsphere.test',
      'admin'
    );

    const catRes = await request(app).get('/api/v1/categories');
    const categoryId = catRes.body.data.categories[0]._id as string;

    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Secure Paid Course',
        shortDescription: 'Security hardened course with paid enrollment.',
        category: categoryId,
        price: 49,
      });
    const courseId = courseRes.body.data.course._id as string;
    const courseSlug = courseRes.body.data.course.slug as string;

    const secRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Module 1' });
    const sectionId = secRes.body.data.section._id as string;

    // Reject javascript: XSS URI in lesson videoUrl
    const xssLessonRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'XSS Probe Lesson',
        type: 'embed',
        videoUrl: 'javascript:alert(document.cookie)',
      });
    expect(xssLessonRes.status).toBe(400);
    expect(xssLessonRes.body.error.code).toBe('VALIDATION_ERROR');

    // Valid HTTPS lesson succeeds
    const validLessonRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Safe Lesson',
        type: 'text',
        content: 'Safe content',
      });
    expect(validLessonRes.status).toBe(201);

    await request(app)
      .post(`/api/v1/courses/${courseId}/submit-review`)
      .set('Authorization', `Bearer ${instructorToken}`);

    await request(app)
      .patch(`/api/v1/admin/courses/${courseId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });

    // Public course detail must NOT leak instructor email
    const publicDetail = await request(app).get(`/api/v1/courses/${courseSlug}`);
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body.data.course.instructor.email).toBeUndefined();

    // Paid course rejects direct enrollment without checkout receipt
    const { token: studentToken } = await createTestUser(
      'Buyer Student',
      'buyer@learnsphere.test',
      'student'
    );
    const unpaidEnroll = await request(app)
      .post(`/api/v1/enrollments/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(unpaidEnroll.status).toBe(400);

    // Checkout endpoint issues server-signed receipt allowing enrollment
    const checkoutRes = await request(app)
      .post(`/api/v1/enrollments/courses/${courseId}/checkout`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(checkoutRes.status).toBe(200);
    const receiptToken = checkoutRes.body.data.paymentReceiptToken as string;

    const paidEnroll = await request(app)
      .post(`/api/v1/enrollments/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ paymentReceiptToken: receiptToken });
    expect(paidEnroll.status).toBe(201);
  });

  it('requires authentication for /uploads/submissions/* downloads', async () => {
    const unauthDownload = await request(app).get(
      '/uploads/submissions/test-file.pdf'
    );
    expect(unauthDownload.status).toBe(401);
  });
});
