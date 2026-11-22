import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/student', analyticsController.student);
router.get(
  '/instructor',
  authorize('instructor', 'admin'),
  analyticsController.instructor
);
router.get('/admin', authorize('admin'), analyticsController.admin);

export default router;
