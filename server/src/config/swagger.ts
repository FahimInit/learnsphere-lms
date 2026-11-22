export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'LearnSphere LMS REST API',
    version: '1.0.0',
    description:
      'Production-grade Learning Management System API supporting Students, Instructors, and Administrators.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base Path',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'System & database healthcheck',
        responses: { '200': { description: 'Service is healthy' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new Student or Instructor account',
        responses: { '201': { description: 'User registered' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate user and issue access + refresh tokens',
        responses: { '200': { description: 'Authenticated' } },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate httpOnly refresh token and issue new access token',
        responses: { '200': { description: 'Session refreshed' } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke refresh session and clear cookie',
        responses: { '200': { description: 'Logged out' } },
      },
    },
    '/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Get authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profile retrieved' } },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Profile updated' } },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List active course categories',
        responses: { '200': { description: 'Categories list' } },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create course category (Admin)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Category created' } },
      },
    },
    '/courses': {
      get: {
        tags: ['Courses'],
        summary: 'Browse, search, and filter published courses',
        responses: { '200': { description: 'Paginated courses list' } },
      },
      post: {
        tags: ['Courses'],
        summary: 'Create a new draft course (Instructor/Admin)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Course created' } },
      },
    },
    '/enrollments/courses/{courseId}': {
      post: {
        tags: ['Enrollments'],
        summary: 'Enroll in a published course',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Enrolled successfully' } },
      },
    },
    '/enrollments/courses/{courseId}/learn': {
      get: {
        tags: ['Enrollments'],
        summary: 'Load authorized learning workspace & resume state',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Workspace loaded' } },
      },
    },
    '/progress/lessons/{lessonId}/toggle': {
      post: {
        tags: ['Progress'],
        summary: 'Toggle lesson completion and recalculate course progress',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Progress updated' } },
      },
    },
    '/quizzes/{id}/attempts': {
      post: {
        tags: ['Quizzes'],
        summary: 'Submit quiz attempt for server-side auto-grading',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Attempt graded' } },
      },
    },
    '/submissions/assignments/{assignmentId}': {
      post: {
        tags: ['Assignments'],
        summary: 'Submit or resubmit an assignment',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Submission recorded' } },
      },
    },
    '/discussions/course/{courseId}': {
      get: {
        tags: ['Discussions'],
        summary: 'List course discussion threads and announcements',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Community feed retrieved' } },
      },
      post: {
        tags: ['Discussions'],
        summary: 'Create a discussion thread',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Thread created' } },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List user notifications and unread count',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Notifications retrieved' } },
      },
    },
    '/certificates/verify/{code}': {
      get: {
        tags: ['Certificates'],
        summary: 'Verify authenticity of a completion certificate publicly',
        responses: { '200': { description: 'Certificate verified' } },
      },
    },
    '/analytics/admin': {
      get: {
        tags: ['Analytics'],
        summary: 'Retrieve platform-wide analytics (Admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Platform analytics' } },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Search and paginate platform users (Admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Users list' } },
      },
    },
  },
};
