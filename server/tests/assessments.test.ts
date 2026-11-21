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

async function setupCourseAndEnrollment() {
  const { token: instructorToken } = await createTestUser(
    'Instructor Author',
    'author@learnsphere.test',
    'instructor'
  );
  const { token: otherInstructorToken } = await createTestUser(
    'Other Instructor',
    'other@learnsphere.test',
    'instructor'
  );
  const { token: adminToken } = await createTestUser(
    'Admin User',
    'admin@learnsphere.test',
    'admin'
  );
  const { token: studentToken } = await createTestUser(
    'Enrolled Student',
    'student@learnsphere.test',
    'student'
  );
  const { token: outsiderToken } = await createTestUser(
    'Outsider Student',
    'outsider@learnsphere.test',
    'student'
  );

  const catRes = await request(app).get('/api/v1/categories');
  const categoryId = catRes.body.data.categories[0]._id as string;

  const courseRes = await request(app)
    .post('/api/v1/courses')
    .set('Authorization', `Bearer ${instructorToken}`)
    .send({
      title: 'TypeScript Assessment Mastery',
      shortDescription: 'Learn rigorous backend testing and assessment workflows.',
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
      title: 'Lesson 1',
      type: 'text',
      content: 'Core concepts',
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
    .set('Authorization', `Bearer ${studentToken}`);

  return {
    courseId,
    instructorToken,
    otherInstructorToken,
    studentToken,
    outsiderToken,
  };
}

describe('Assessment System: Quizzes, Auto-Grading, Assignments & Grading API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('strips correct answers for students, grades MCQ/Multi-Select/True-False automatically, and enforces attempt limits', async () => {
    const {
      courseId,
      instructorToken,
      otherInstructorToken,
      studentToken,
      outsiderToken,
    } = await setupCourseAndEnrollment();

    // Instructor creates quiz with maxAttempts = 2 and passingScorePercentage = 70
    const quizRes = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        courseId,
        title: 'Module 1 Checkpoint Quiz',
        maxAttempts: 2,
        passingScorePercentage: 70,
        timeLimitMinutes: 15,
      });

    expect(quizRes.status).toBe(201);
    const quizId = quizRes.body.data.quiz._id as string;

    // IDOR check: another instructor cannot add questions
    const idorRes = await request(app)
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${otherInstructorToken}`)
      .send({
        type: 'true_false',
        prompt: 'Unauthorized question',
        options: [
          { id: 't', text: 'True' },
          { id: 'f', text: 'False' },
        ],
        correctOptionIds: ['t'],
      });
    expect(idorRes.status).toBe(403);

    // Add 3 questions (2 pts + 3 pts + 5 pts = 10 pts total)
    const q1Res = await request(app)
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        type: 'mcq',
        prompt: 'Which HTTP status code represents a conflict?',
        options: [
          { id: 'a', text: '404' },
          { id: 'b', text: '409' },
          { id: 'c', text: '500' },
        ],
        correctOptionIds: ['b'],
        points: 2,
        explanation: '409 Conflict indicates duplicate or conflicting state.',
      });
    expect(q1Res.status).toBe(201);
    const q1Id = q1Res.body.data.question._id as string;

    const q2Res = await request(app)
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        type: 'multi_select',
        prompt: 'Select all idempotent HTTP methods:',
        options: [
          { id: 'get', text: 'GET' },
          { id: 'post', text: 'POST' },
          { id: 'put', text: 'PUT' },
        ],
        correctOptionIds: ['get', 'put'],
        points: 3,
      });
    expect(q2Res.status).toBe(201);
    const q2Id = q2Res.body.data.question._id as string;

    const q3Res = await request(app)
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        type: 'true_false',
        prompt: 'JWT payloads are encrypted by default.',
        options: [
          { id: 'true', text: 'True' },
          { id: 'false', text: 'False' },
        ],
        correctOptionIds: ['false'],
        points: 5,
        explanation: 'Standard JWS JWTs are base64url encoded and signed, not encrypted.',
      });
    expect(q3Res.status).toBe(201);
    const q3Id = q3Res.body.data.question._id as string;

    // Unenrolled outsider is blocked from fetching quiz
    const outsiderRes = await request(app)
      .get(`/api/v1/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);
    expect(outsiderRes.status).toBe(403);

    // Enrolled student fetches quiz: correctOptionIds & explanation MUST be stripped
    const studentFetch = await request(app)
      .get(`/api/v1/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studentFetch.status).toBe(200);
    expect(studentFetch.body.data.questions).toHaveLength(3);
    for (const q of studentFetch.body.data.questions) {
      expect(q.correctOptionIds).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }

    // Attempt 1: Student gets only Q1 right (2/10 = 20% -> fail)
    const attempt1 = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [
          { questionId: q1Id, selectedOptionIds: ['b'] },
          { questionId: q2Id, selectedOptionIds: ['get'] }, // incomplete multi_select
          { questionId: q3Id, selectedOptionIds: ['true'] },
        ],
      });
    expect(attempt1.status).toBe(201);
    expect(attempt1.body.data.attempt.scorePercentage).toBe(20);
    expect(attempt1.body.data.attempt.passed).toBe(false);
    expect(attempt1.body.data.attempt.attemptNumber).toBe(1);

    // Attempt 2: Student gets all 3 right (10/10 = 100% -> pass)
    const attempt2 = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [
          { questionId: q1Id, selectedOptionIds: ['b'] },
          { questionId: q2Id, selectedOptionIds: ['put', 'get'] }, // order-independent
          { questionId: q3Id, selectedOptionIds: ['false'] },
        ],
      });
    expect(attempt2.status).toBe(201);
    expect(attempt2.body.data.attempt.scorePercentage).toBe(100);
    expect(attempt2.body.data.attempt.passed).toBe(true);
    expect(attempt2.body.data.review[2].explanation).toContain('signed');

    // Attempt 3: Blocked because maxAttempts (2) reached
    const attempt3 = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [{ questionId: q1Id, selectedOptionIds: ['b'] }],
      });
    expect(attempt3.status).toBe(400);

    // Attempt history returns 2 attempts
    const historyRes = await request(app)
      .get(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.attempts).toHaveLength(2);
  });

  it('handles assignment submission, file upload validation, resubmissions, and instructor grading with history', async () => {
    const {
      courseId,
      instructorToken,
      otherInstructorToken,
      studentToken,
    } = await setupCourseAndEnrollment();

    const futureDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const assignRes = await request(app)
      .post('/api/v1/assignments')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        courseId,
        title: 'API Architecture Proposal',
        instructions: 'Submit a concise REST API design document with endpoints and schema.',
        dueDate: futureDueDate,
        maxScore: 100,
        allowResubmission: true,
        maxResubmissions: 2,
        allowedFileTypes: ['.txt', '.pdf'],
      });

    expect(assignRes.status).toBe(201);
    const assignmentId = assignRes.body.data.assignment._id as string;

    // Reject disallowed executable file extension
    const badUpload = await request(app)
      .post(`/api/v1/submissions/assignments/${assignmentId}/upload`)
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', Buffer.from('malware'), 'payload.exe');
    expect(badUpload.status).toBe(400);

    // Allow valid .txt file upload
    const goodUpload = await request(app)
      .post(`/api/v1/submissions/assignments/${assignmentId}/upload`)
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', Buffer.from('Architecture proposal text'), 'proposal.txt');
    expect(goodUpload.status).toBe(201);
    const uploadedFile = goodUpload.body.data.file;

    // Student submits assignment
    const sub1Res = await request(app)
      .post(`/api/v1/submissions/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        textResponse: 'Initial proposal draft attached.',
        attachments: [uploadedFile],
      });
    expect(sub1Res.status).toBe(201);
    const submissionId = sub1Res.body.data.submission._id as string;
    expect(sub1Res.body.data.submission.submissionCount).toBe(1);

    // Another instructor cannot grade someone else's course submission
    const idorGrade = await request(app)
      .patch(`/api/v1/submissions/${submissionId}/grade`)
      .set('Authorization', `Bearer ${otherInstructorToken}`)
      .send({ grade: 90, feedback: 'Hijacked' });
    expect(idorGrade.status).toBe(403);

    // Owning instructor returns for revision with score 65
    const grade1 = await request(app)
      .patch(`/api/v1/submissions/${submissionId}/grade`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        grade: 65,
        feedback: 'Please add rate limiting details and resubmit.',
        status: 'returned_for_revision',
      });
    expect(grade1.status).toBe(200);
    expect(grade1.body.data.submission.status).toBe('returned_for_revision');
    expect(grade1.body.data.submission.gradeHistory).toHaveLength(1);

    // Student resubmits (attempt 2 of 2)
    const sub2Res = await request(app)
      .post(`/api/v1/submissions/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        textResponse: 'Updated proposal with rate limiting section.',
        attachments: [uploadedFile],
      });
    expect(sub2Res.status).toBe(201);
    expect(sub2Res.body.data.submission.submissionCount).toBe(2);
    expect(sub2Res.body.data.submission.status).toBe('submitted');

    // Third submission exceeds maxResubmissions (2)
    const sub3Res = await request(app)
      .post(`/api/v1/submissions/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ textResponse: 'Third attempt should fail' });
    expect(sub3Res.status).toBe(400);

    // Instructor grades final submission 95/100 and gradeHistory now has 2 entries
    const grade2 = await request(app)
      .patch(`/api/v1/submissions/${submissionId}/grade`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        grade: 95,
        feedback: 'Great improvements on rate limiting!',
        status: 'graded',
      });
    expect(grade2.status).toBe(200);
    expect(grade2.body.data.submission.grade).toBe(95);
    expect(grade2.body.data.submission.gradeHistory).toHaveLength(2);
  });
});
