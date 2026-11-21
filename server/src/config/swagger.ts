export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'LearnSphere LMS REST API',
    version: '1.0.0',
    description:
      'Production-minded Learning Management System API supporting Students, Instructors, and Administrators.',
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
        responses: {
          '200': {
            description: 'Service is healthy',
          },
        },
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
    '/courses': {
      get: {
        tags: ['Courses'],
        summary: 'Browse and filter published courses',
        responses: { '200': { description: 'Paginated courses list' } },
      },
      post: {
        tags: ['Courses'],
        summary: 'Create a new draft course (Instructor/Admin)',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Course created' } },
      },
    },
  },
};
