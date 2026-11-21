import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('System Foundation & Health Endpoints', () => {
  it('GET /api/v1/health returns 200 and standardized operational payload', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe('learnsphere-api');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBeDefined();
  });

  it('GET /api/v1/docs.json returns OpenAPI 3.0 specification', async () => {
    const res = await request(app).get('/api/v1/docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toContain('LearnSphere');
  });

  it('GET /api/v1/non-existent-route returns 404 NOT_FOUND error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
