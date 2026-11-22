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

describe('Phase 7: Certificates, Admin Governance, AuditLogs & Analytics API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('prevents premature certificate claims, issues verifiable certificate at 100% completion, and supports public verification', async () => {
    const { token: instructorToken } = await createTestUser(
      'Inst Cert',
      'instcert@learnsphere.test',
      'instructor'
    );
    const { token: adminToken } = await createTestUser(
      'Admin Cert',
      'admincert@learnsphere.test',
      'admin'
    );
    const { token: studentToken } = await createTestUser(
      'Alice Graduate',
      'alicegrad@learnsphere.test',
      'student'
    );

    const catRes = await request(app).get('/api/v1/categories');
    const categoryId = catRes.body.data.categories[0]._id as string;

    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Cloud Native Architecture',
        shortDescription: 'Master Kubernetes, Docker, and observability.',
        category: categoryId,
      });
    const courseId = courseRes.body.data.course._id as string;

    const secRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ title: 'Module 1' });
    const sectionId = secRes.body.data.section._id as string;

    const lesRes = await request(app)
      .post(`/api/v1/courses/${courseId}/sections/${sectionId}/lessons`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Container Primitives',
        type: 'text',
        content: 'Namespaces and cgroups',
      });
    const lessonId = lesRes.body.data.lesson._id as string;

    await request(app)
      .post(`/api/v1/courses/${courseId}/submit-review`)
      .set('Authorization', `Bearer ${instructorToken}`);

    await request(app)
      .patch(`/api/v1/admin/courses/${courseId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });

    await request(app)
      .post(`/api/v1/enrollments/courses/${courseId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    // Premature certificate claim before completing lessons fails
    const prematureClaim = await request(app)
      .post(`/api/v1/certificates/courses/${courseId}/claim`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(prematureClaim.status).toBe(400);

    // Complete the only lesson -> reaches 100% and automatically issues certificate
    const toggleRes = await request(app)
      .post(`/api/v1/progress/lessons/${lessonId}/toggle`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ isCompleted: true });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.enrollment.progressPercentage).toBe(100);
    const certCode = toggleRes.body.data.certificateCode as string;
    expect(certCode).toMatch(/^LS-\d{4}-[A-F0-9]+$/);

    // Claiming again is idempotent and returns the same certificate
    const idempotentClaim = await request(app)
      .post(`/api/v1/certificates/courses/${courseId}/claim`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(idempotentClaim.status).toBe(200);
    expect(idempotentClaim.body.data.certificate.certificateCode).toBe(certCode);

    // My certificates lists 1 certificate
    const myCerts = await request(app)
      .get('/api/v1/certificates/my-certificates')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(myCerts.status).toBe(200);
    expect(myCerts.body.data.certificates).toHaveLength(1);

    // Public verification succeeds without auth token
    const verifyRes = await request(app).get(
      `/api/v1/certificates/verify/${certCode}`
    );
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.valid).toBe(true);
    expect(verifyRes.body.data.certificate.studentNameSnapshot).toBe(
      'Alice Graduate'
    );
    expect(verifyRes.body.data.certificate.courseTitleSnapshot).toBe(
      'Cloud Native Architecture'
    );

    // Invalid code returns 404
    const invalidVerify = await request(app).get(
      '/api/v1/certificates/verify/LS-2026-NONEXISTENT'
    );
    expect(invalidVerify.status).toBe(404);
  });

  it('enforces admin RBAC, manages users/moderation/settings with AuditLogs, and computes live analytics', async () => {
    const { user: studentUser, token: studentToken } = await createTestUser(
      'Bob Student',
      'bob@learnsphere.test',
      'student'
    );
    const { token: instructorToken } = await createTestUser(
      'Carol Instructor',
      'carol@learnsphere.test',
      'instructor'
    );
    const { token: adminToken } = await createTestUser(
      'Super Admin',
      'superadmin@learnsphere.test',
      'admin'
    );

    // Non-admins blocked from admin endpoints
    const nonAdminAttempt = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(nonAdminAttempt.status).toBe(403);

    // Admin lists users and suspends Bob
    const usersRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(usersRes.status).toBe(200);
    expect(usersRes.body.data.users.length).toBeGreaterThanOrEqual(3);

    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${studentUser._id.toString()}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.user.status).toBe('suspended');

    // Suspended student cannot access analytics
    const blockedStudent = await request(app)
      .get('/api/v1/analytics/student')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(blockedStudent.status).toBe(403);

    // Reactivate student and promote role
    await request(app)
      .patch(`/api/v1/admin/users/${studentUser._id.toString()}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });

    const roleRes = await request(app)
      .patch(`/api/v1/admin/users/${studentUser._id.toString()}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'instructor' });
    expect(roleRes.status).toBe(200);
    expect(roleRes.body.data.user.role).toBe('instructor');

    // Update platform settings
    const settingsRes = await request(app)
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        platformName: 'LearnSphere Enterprise',
        allowInstructorSignup: true,
      });
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.data.settings.platformName).toBe(
      'LearnSphere Enterprise'
    );

    // Audit logs recorded the actions
    const logsRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.data.logs.length).toBeGreaterThanOrEqual(4);

    // Analytics endpoints return structured live summaries
    const [studentAnalytics, instructorAnalytics, adminAnalytics] =
      await Promise.all([
        request(app)
          .get('/api/v1/analytics/student')
          .set('Authorization', `Bearer ${studentToken}`),
        request(app)
          .get('/api/v1/analytics/instructor')
          .set('Authorization', `Bearer ${instructorToken}`),
        request(app)
          .get('/api/v1/analytics/admin')
          .set('Authorization', `Bearer ${adminToken}`),
      ]);

    expect(studentAnalytics.status).toBe(200);
    expect(studentAnalytics.body.data.summary).toBeDefined();

    expect(instructorAnalytics.status).toBe(200);
    expect(instructorAnalytics.body.data.submissionStats).toBeDefined();

    expect(adminAnalytics.status).toBe(200);
    expect(adminAnalytics.body.data.summary.totalUsers).toBeGreaterThanOrEqual(3);
    expect(adminAnalytics.body.data.breakdowns.usersByRole).toBeDefined();
  });
});
