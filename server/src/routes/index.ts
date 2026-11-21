import { Router, Request, Response } from 'express';
import { getDatabaseHealth } from '../config/db';
import { openApiSpec } from '../config/swagger';
import { sendSuccess } from '../utils/apiResponse';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';

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

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
