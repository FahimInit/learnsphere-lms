import { connectDatabase, disconnectDatabase } from '../config/db';
import { User, hashPassword } from '../modules/users/user.model';
import { Category } from '../modules/categories/category.model';
import { categoryService } from '../modules/categories/category.service';
import { Course } from '../modules/courses/course.model';
import { Section } from '../modules/sections/section.model';
import { Lesson } from '../modules/lessons/lesson.model';
import { Quiz } from '../modules/quizzes/quiz.model';
import { Question } from '../modules/quizzes/question.model';
import { Assignment } from '../modules/assignments/assignment.model';
import { Enrollment } from '../modules/enrollments/enrollment.model';
import { LessonProgress } from '../modules/progress/progress.model';
import { Certificate } from '../modules/certificates/certificate.model';
import { CourseReview } from '../modules/courses/review.model';
import { Discussion } from '../modules/discussions/discussion.model';
import { Comment } from '../modules/discussions/comment.model';
import { Announcement } from '../modules/discussions/announcement.model';
import { Notification } from '../modules/notifications/notification.model';
import { logger } from '../utils/logger';

const DEFAULT_SAMPLE_VIDEO_URL =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

/**
 * Seeds demo users, categories, courses, quizzes, and notifications if the
 * database does not already contain the demo admin account.
 */
export async function seedData(): Promise<void> {
  // Replace deprecated commondatastorage sample URLs on existing seeded lessons
  await Lesson.updateMany(
    { videoUrl: /commondatastorage\.googleapis\.com\/gtv-videos-bucket/i },
    { $set: { videoUrl: DEFAULT_SAMPLE_VIDEO_URL } }
  );

  const existingAdmin = await User.findOne({ email: 'admin@learnsphere.dev' });
  if (existingAdmin) {
    logger.info('Database already contains LearnSphere seed data. Skipping.');
    return;
  }

  logger.info('Seeding LearnSphere development database...');

  await categoryService.seedDefaultCategories();
  const categories = await Category.find();
  const webCat = categories.find((c) => c.slug === 'web-development') || categories[0];
  const cloudCat = categories.find((c) => c.slug === 'cloud-devops') || categories[0];
  const archCat =
    categories.find((c) => c.slug === 'software-architecture') || categories[0];

  const defaultPasswordHash = await hashPassword('Password123');

  const [admin, instructor1, instructor2, student1, student2] = await User.create([
    {
      name: 'Elena Vance',
      email: 'admin@learnsphere.dev',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      status: 'active',
      headline: 'Platform Administrator',
      bio: 'Overseeing curriculum quality, platform governance, and learner success.',
      isEmailVerified: true,
    },
    {
      name: 'Sarah Chen',
      email: 'sarah.chen@learnsphere.dev',
      passwordHash: defaultPasswordHash,
      role: 'instructor',
      status: 'active',
      headline: 'Staff Full-Stack Engineer & TypeScript Author',
      bio: '10+ years building high-throughput Node.js, React, and MongoDB platforms.',
      isEmailVerified: true,
    },
    {
      name: 'Marcus Reed',
      email: 'marcus.reed@learnsphere.dev',
      passwordHash: defaultPasswordHash,
      role: 'instructor',
      status: 'active',
      headline: 'Principal Cloud & Distributed Systems Architect',
      bio: 'Specializing in Docker, Kubernetes, observability, and resilient APIs.',
      isEmailVerified: true,
    },
    {
      name: 'Alex Rivera',
      email: 'alex.rivera@learnsphere.dev',
      passwordHash: defaultPasswordHash,
      role: 'student',
      status: 'active',
      headline: 'Software Engineering Undergraduate',
      bio: 'Learning full-stack architecture and cloud-native deployment.',
      isEmailVerified: true,
    },
    {
      name: 'Priya Patel',
      email: 'priya.patel@learnsphere.dev',
      passwordHash: defaultPasswordHash,
      role: 'student',
      status: 'active',
      headline: 'Backend Developer',
      bio: 'Focused on distributed systems, testing, and API security.',
      isEmailVerified: true,
    },
  ]);

  // Course 1: Published Full-Stack MERN Course
  const course1 = await Course.create({
    title: 'Production MERN Stack Engineering with TypeScript',
    slug: 'production-mern-typescript',
    shortDescription:
      'Design, secure, test, and containerize modular MERN applications using TypeScript, Zod, and TanStack Query.',
    fullDescription:
      'Go beyond toy CRUD tutorials. In this comprehensive engineering course, you will architect a modular REST backend with Express and Mongoose, enforce RBAC and IDOR protections, write Supertest integration suites, and build a crisp React + Tailwind SaaS frontend.',
    instructor: instructor1._id,
    category: webCat._id,
    tags: ['typescript', 'react', 'nodejs', 'mongodb'],
    level: 'intermediate',
    price: 49,
    prerequisites: ['Basic JavaScript/TypeScript syntax', 'Familiarity with HTTP APIs'],
    learningObjectives: [
      'Design modular controller-service-model backend architectures',
      'Implement JWT access + rotating httpOnly refresh token authentication',
      'Write automated Vitest and Supertest integration suites',
      'Build responsive SaaS dashboards with React Query and Recharts',
    ],
    estimatedDurationMinutes: 45,
    status: 'published',
    publishedAt: new Date(),
    enrollmentCount: 2,
    averageRating: 4.5,
    reviewCount: 2,
    totalLessonsCount: 3,
  });

  const c1Sec1 = await Section.create({
    course: course1._id,
    title: 'Backend Modularity & Security',
    description: 'Structuring domain modules, validation, and authentication',
    order: 0,
  });

  const [c1L1, c1L2, c1L3] = await Lesson.create([
    {
      course: course1._id,
      section: c1Sec1._id,
      title: 'Architectural Overview & Modular Monolith Patterns',
      slug: 'architectural-overview-modular-monolith',
      type: 'video',
      videoUrl: DEFAULT_SAMPLE_VIDEO_URL,
      videoDurationSeconds: 900,
      content:
        'In this lesson we compare layered modular monoliths against premature microservices and establish clear domain boundaries.',
      isPreview: true,
      order: 0,
    },
    {
      course: course1._id,
      section: c1Sec1._id,
      title: 'Defense-in-Depth Authentication & RBAC',
      slug: 'defense-in-depth-auth-rbac',
      type: 'text',
      videoDurationSeconds: 900,
      content:
        '# Authentication & RBAC\n\nAlways verify JWT access tokens against live user status in MongoDB, store refresh tokens as SHA-256 hashes inside httpOnly cookies, and enforce ownership filters in your service layer to eliminate IDOR vulnerabilities.',
      isPreview: false,
      order: 1,
    },
    {
      course: course1._id,
      section: c1Sec1._id,
      title: 'Automated Testing with Vitest & Supertest',
      slug: 'automated-testing-vitest-supertest',
      type: 'text',
      videoDurationSeconds: 900,
      content:
        '# Integration Testing\n\nDecouple Express app creation (`app.ts`) from HTTP server listening (`server.ts`) so Supertest can exercise real middleware, Zod validators, and MongoDB queries deterministically.',
      isPreview: false,
      order: 2,
    },
  ]);

  // Course 2: Free Published Cloud & Docker Course
  const course2 = await Course.create({
    title: 'Docker & CI/CD Pipelines for Full-Stack Developers',
    slug: 'docker-cicd-fullstack',
    shortDescription:
      'Master multi-stage Dockerfiles, Docker Compose healthchecks, and automated GitHub Actions verification.',
    fullDescription:
      'Learn how to package Node.js APIs and Vite React SPAs into lean production containers with deterministic local Compose stacks and automated CI pipelines.',
    instructor: instructor2._id,
    category: cloudCat._id,
    tags: ['docker', 'ci-cd', 'devops', 'github-actions'],
    level: 'beginner',
    price: 0,
    prerequisites: ['Basic command-line familiarity'],
    learningObjectives: [
      'Write multi-stage Dockerfiles for Node.js and Nginx SPAs',
      'Configure Docker Compose healthchecks and persistent volumes',
      'Automate typechecking, testing, and builds in GitHub Actions',
    ],
    estimatedDurationMinutes: 25,
    status: 'published',
    publishedAt: new Date(),
    enrollmentCount: 1,
    averageRating: 5,
    reviewCount: 1,
    totalLessonsCount: 2,
  });

  const c2Sec1 = await Section.create({
    course: course2._id,
    title: 'Containerization Fundamentals',
    description: 'Building multi-stage images and Compose orchestration',
    order: 0,
  });

  const [c2L1, c2L2] = await Lesson.create([
    {
      course: course2._id,
      section: c2Sec1._id,
      title: 'Multi-Stage Dockerfiles Explained',
      slug: 'multi-stage-dockerfiles',
      type: 'text',
      videoDurationSeconds: 720,
      content:
        '# Multi-Stage Builds\n\nSeparate build-time TypeScript compilers from lean production runtime images to shrink container size and attack surface.',
      isPreview: true,
      order: 0,
    },
    {
      course: course2._id,
      section: c2Sec1._id,
      title: 'Docker Compose Healthchecks & Volumes',
      slug: 'docker-compose-healthchecks',
      type: 'text',
      videoDurationSeconds: 780,
      content:
        '# Healthchecks\n\nUse `depends_on: condition: service_healthy` so your API server waits until MongoDB is genuinely accepting connections.',
      isPreview: false,
      order: 1,
    },
  ]);

  // Course 3: Pending Review Course (for Admin Moderation Demo)
  const course3 = await Course.create({
    title: 'Event-Driven Systems & Real-Time Architecture',
    slug: 'event-driven-systems-realtime',
    shortDescription:
      'Design scalable WebSocket gateways, idempotent message consumers, and real-time notification pipelines.',
    fullDescription:
      'Submitted by Marcus Reed for administrator review. Covers Socket.IO room authorization, backpressure, and dead-letter queues.',
    instructor: instructor2._id,
    category: archCat._id,
    tags: ['websockets', 'architecture', 'redis'],
    level: 'advanced',
    price: 79,
    learningObjectives: ['Architect horizontal WebSocket clusters'],
    estimatedDurationMinutes: 15,
    status: 'pending_review',
    totalLessonsCount: 1,
  });

  const c3Sec1 = await Section.create({
    course: course3._id,
    title: 'Real-Time Foundations',
    order: 0,
  });

  await Lesson.create({
    course: course3._id,
    section: c3Sec1._id,
    title: 'Authenticated Socket.IO Handshakes',
    slug: 'authenticated-socketio-handshakes',
    type: 'text',
    videoDurationSeconds: 900,
    content: '# Socket.IO JWT Auth\n\nVerify access tokens during handshake middleware before joining personal rooms.',
    isPreview: true,
    order: 0,
  });

  await Category.findByIdAndUpdate(webCat._id, { $inc: { courseCount: 1 } });
  await Category.findByIdAndUpdate(cloudCat._id, { $inc: { courseCount: 1 } });

  // Quiz & Assignment for Course 1
  const quiz1 = await Quiz.create({
    course: course1._id,
    title: 'Backend Security & Architecture Checkpoint',
    description: 'Verify your understanding of modular monoliths, JWT rotation, and RBAC.',
    timeLimitMinutes: 15,
    maxAttempts: 3,
    passingScorePercentage: 70,
    isPublished: true,
    totalPoints: 3,
    questionCount: 2,
  });

  await Question.create([
    {
      quiz: quiz1._id,
      type: 'mcq',
      prompt: 'Where should refresh tokens be stored on the browser client to mitigate XSS theft?',
      options: [
        { id: 'a', text: 'localStorage' },
        { id: 'b', text: 'httpOnly cookie' },
        { id: 'c', text: 'URL query parameter' },
      ],
      correctOptionIds: ['b'],
      points: 2,
      explanation: 'httpOnly cookies cannot be read via client-side JavaScript.',
      order: 0,
    },
    {
      quiz: quiz1._id,
      type: 'true_false',
      prompt: 'Frontend route guards alone are sufficient to enforce Role-Based Access Control.',
      options: [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ],
      correctOptionIds: ['false'],
      points: 1,
      explanation: 'Every sensitive endpoint must enforce RBAC and resource ownership on the server.',
      order: 1,
    },
  ]);

  await Assignment.create({
    course: course1._id,
    title: 'Design an IDOR-Safe Service Layer',
    instructions:
      'Describe how your service layer validates course ownership and active student enrollments before serving protected resources.',
    maxScore: 100,
    allowResubmission: true,
    maxResubmissions: 3,
    isPublished: true,
  });

  // Enrollments, Progress & Certificate
  const enroll1 = await Enrollment.create({
    student: student1._id,
    course: course1._id,
    status: 'active',
    progressPercentage: 33,
    completedLessonsCount: 1,
    lastAccessedLesson: c1L2._id,
    enrolledAt: new Date(),
  });

  await LessonProgress.create({
    enrollment: enroll1._id,
    student: student1._id,
    course: course1._id,
    lesson: c1L1._id,
    isCompleted: true,
    completedAt: new Date(),
    watchTimeSeconds: 900,
    notes: 'Modular monolith keeps transactions simple while preserving clean boundaries.',
  });

  // Student 1 completed Course 2 -> Earned Certificate
  const enroll2 = await Enrollment.create({
    student: student1._id,
    course: course2._id,
    status: 'completed',
    progressPercentage: 100,
    completedLessonsCount: 2,
    lastAccessedLesson: c2L2._id,
    enrolledAt: new Date(Date.now() - 86400000 * 3),
    completedAt: new Date(),
  });

  await LessonProgress.create([
    {
      enrollment: enroll2._id,
      student: student1._id,
      course: course2._id,
      lesson: c2L1._id,
      isCompleted: true,
      completedAt: new Date(),
      watchTimeSeconds: 720,
    },
    {
      enrollment: enroll2._id,
      student: student1._id,
      course: course2._id,
      lesson: c2L2._id,
      isCompleted: true,
      completedAt: new Date(),
      watchTimeSeconds: 780,
    },
  ]);

  await Certificate.create({
    certificateCode: 'LS-2026-DEMO1001',
    student: student1._id,
    course: course2._id,
    enrollment: enroll2._id,
    studentNameSnapshot: student1.name,
    courseTitleSnapshot: course2.title,
    instructorNameSnapshot: instructor2.name,
    issuedAt: new Date(),
  });

  await Enrollment.create({
    student: student2._id,
    course: course1._id,
    status: 'active',
    progressPercentage: 0,
    completedLessonsCount: 0,
    lastAccessedLesson: c1L1._id,
  });

  // Reviews, Discussions, Announcements & Notifications
  await CourseReview.create([
    {
      course: course1._id,
      student: student1._id,
      rating: 5,
      comment: 'Crystal clear architectural breakdown and real-world security patterns.',
    },
    {
      course: course1._id,
      student: student2._id,
      rating: 4,
      comment: 'Very practical TypeScript and Mongoose validation coverage.',
    },
    {
      course: course2._id,
      student: student1._id,
      rating: 5,
      comment: 'Multi-stage Dockerfile walkthrough saved me hours of debugging!',
    },
  ]);

  const thread = await Discussion.create({
    course: course1._id,
    author: student1._id,
    title: 'How should we handle MongoDB transactions in standalone local dev?',
    content: 'Does Mongoose require a replica set for multi-document sessions?',
    isPinned: true,
    isResolved: true,
    replyCount: 1,
  });

  await Comment.create({
    discussion: thread._id,
    author: instructor1._id,
    content:
      'Great question! MongoDB transactions require a replica set (`--replSet rs0`). In local single-node dev, deterministic count queries + unique compound indexes also provide strong integrity.',
    isInstructorReply: true,
  });

  await Announcement.create({
    course: course1._id,
    instructor: instructor1._id,
    title: 'Welcome to Cohort 1!',
    content:
      'Feel free to post questions in the Discussion tab as you work through the backend security module.',
  });

  await Notification.create([
    {
      recipient: student1._id,
      type: 'certificate_issued',
      title: 'Certificate Earned!',
      message: `Congratulations on completing "${course2.title}"! Your verified certificate (LS-2026-DEMO1001) is ready.`,
      linkUrl: '/certificates/verify/LS-2026-DEMO1001',
      isRead: false,
    },
    {
      recipient: admin._id,
      type: 'course_status',
      title: 'New Course Pending Review',
      message: `Marcus Reed submitted "${course3.title}" for administrator approval.`,
      linkUrl: '/admin',
      isRead: false,
    },
  ]);

  logger.info('LearnSphere development database seeded successfully.');
}

async function runSeed(): Promise<void> {
  await connectDatabase();
  try {
    await seedData();
  } finally {
    await disconnectDatabase();
  }
}

if (require.main === module) {
  runSeed().catch((err) => {
    logger.error('Seed script failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  });
}
