import { Router, Request, Response } from 'express';
import { getDatabaseHealth } from '../config/db';
import { openApiSpec } from '../config/swagger';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const dbHealth = getDatabaseHealth();
  return sendSuccess(
    res,
    {
      service: 'learnsphere-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: dbHealth,
    },
    'LearnSphere API is operational'
  );
});

router.get('/docs.json', (_req: Request, res: Response) => {
  return res.status(200).json(openApiSpec);
});

export default router;
