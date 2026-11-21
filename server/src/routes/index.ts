import { Router, Request, Response } from 'express';
import { getDatabaseHealth } from '../config/db';
import { openApiSpec } from '../config/swagger';
import { sendSuccess } from '../utils/apiResponse';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import categoryRoutes from '../modules/categories/category.routes';
import courseRoutes from '../modules/courses/course.routes';
import enrollmentRoutes from '../modules/enrollments/enrollment.routes';
import progressRoutes from '../modules/progress/progress.routes';
import quizRoutes from '../modules/quizzes/quiz.routes';
import assignmentRoutes from '../modules/assignments/assignment.routes';
import submissionRoutes from '../modules/assignments/submission.routes';

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
router.use('/categories', categoryRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/progress', progressRoutes);
router.use('/quizzes', quizRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/submissions', submissionRoutes);

export default router;
