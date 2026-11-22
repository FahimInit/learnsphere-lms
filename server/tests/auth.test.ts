import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/modules/users/user.model';
import { consoleEmailProvider } from '../src/infrastructure/email/email.service';
import { setupTestDB, clearTestDB, teardownTestDB } from './setupTestDB';

describe('Authentication, Session Security & User Profile API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('registers a student account, returns accessToken, and sets httpOnly refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Student',
      email: 'alice@learnsphere.test',
      password: 'Password123',
      role: 'student',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('alice@learnsphere.test');
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.accessToken).toBeTypeOf('string');

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('learnsphere_refresh_token'))).toBe(true);
  });

  it('prevents duplicate email registration with 409 CONFLICT', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Student',
      email: 'alice@learnsphere.test',
      password: 'Password123',
    });

    const dup = await request(app).post('/api/v1/auth/register').send({
      name: 'Alice Clone',
      email: 'alice@learnsphere.test',
      password: 'Password123',
    });

    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('CONFLICT');
  });

  it('blocks privilege escalation attempt to self-register as admin', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Malicious Actor',
      email: 'evil@learnsphere.test',
      password: 'Password123',
      role: 'admin',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with valid credentials and rejects wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Bob Instructor',
      email: 'bob@learnsphere.test',
      password: 'Password123',
      role: 'instructor',
    });

    const badRes = await request(app).post('/api/v1/auth/login').send({
      email: 'bob@learnsphere.test',
      password: 'WrongPassword99',
    });
    expect(badRes.status).toBe(401);

    const okRes = await request(app).post('/api/v1/auth/login').send({
      email: 'bob@learnsphere.test',
      password: 'Password123',
    });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.user.role).toBe('instructor');
    expect(okRes.body.data.accessToken).toBeTypeOf('string');
  });

  it('rotates refresh token and rejects replay of old refresh token', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Charlie Learner',
      email: 'charlie@learnsphere.test',
      password: 'Password123',
    });

    const initialCookie = (regRes.headers['set-cookie'] as unknown as string[])[0];

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', initialCookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTypeOf('string');

    // Attempt to replay the old rotated refresh cookie
    const replayRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', initialCookie);

    expect(replayRes.status).toBe(401);
  });

  it('blocks suspended users from accessing protected routes or logging in', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Suspended User',
      email: 'suspended@learnsphere.test',
      password: 'Password123',
    });

    const token = regRes.body.data.accessToken as string;
    await User.findOneAndUpdate(
      { email: 'suspended@learnsphere.test' },
      { status: 'suspended' }
    );

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(403);
    expect(meRes.body.error.code).toBe('ACCOUNT_SUSPENDED');

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'suspended@learnsphere.test',
      password: 'Password123',
    });
    expect(loginRes.status).toBe(403);
  });

  it('completes forgot-password and reset-password flow', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Dana Student',
      email: 'dana@learnsphere.test',
      password: 'OldPassword123',
    });

    const forgotRes = await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'dana@learnsphere.test',
    });

    expect(forgotRes.status).toBe(200);
    // Token must NEVER be leaked in the HTTP response body
    expect(forgotRes.body.data.resetToken).toBeUndefined();

    const lastEmail =
      consoleEmailProvider.sentEmails[consoleEmailProvider.sentEmails.length - 1];
    const tokenMatch = lastEmail?.text.match(/([a-f0-9]{64})$/);
    expect(tokenMatch).not.toBeNull();
    const resetToken = tokenMatch![1];

    const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
      token: resetToken,
      password: 'NewPassword456',
    });
    expect(resetRes.status).toBe(200);

    const oldLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'dana@learnsphere.test',
      password: 'OldPassword123',
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'dana@learnsphere.test',
      password: 'NewPassword456',
    });
    expect(newLogin.status).toBe(200);
  });

  it('updates profile, changes password, and upgrades student to instructor', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Evan Learner',
      email: 'evan@learnsphere.test',
      password: 'Password123',
    });

    const token = regRes.body.data.accessToken as string;

    const patchRes = await request(app)
      .patch('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Evan Pro',
        headline: 'Full-Stack Developer',
        bio: 'Building real-world systems',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.user.name).toBe('Evan Pro');
    expect(patchRes.body.data.user.headline).toBe('Full-Stack Developer');

    const upgradeRes = await request(app)
      .post('/api/v1/users/become-instructor')
      .set('Authorization', `Bearer ${token}`);

    expect(upgradeRes.status).toBe(200);
    expect(upgradeRes.body.data.user.role).toBe('instructor');

    // Second upgrade call should be rejected by RBAC since user is now instructor
    const secondUpgrade = await request(app)
      .post('/api/v1/users/become-instructor')
      .set('Authorization', `Bearer ${upgradeRes.body.data.accessToken}`);
    expect(secondUpgrade.status).toBe(403);
  });
});
