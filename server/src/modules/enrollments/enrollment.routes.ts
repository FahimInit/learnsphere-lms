import { Router } from 'express';
import { enrollmentController } from './enrollment.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/my-enrollments', enrollmentController.getMyEnrollments);
router.post('/courses/:courseId/checkout', enrollmentController.createCheckout);
router.post('/courses/:courseId', enrollmentController.enroll);
router.get('/courses/:courseId/check', enrollmentController.checkStatus);
router.get('/courses/:courseId/learn', enrollmentController.getLearningWorkspace);
router.get(
  '/courses/:courseId/students',
  authorize('instructor', 'admin'),
  enrollmentController.getCourseStudents
);

export default router;
