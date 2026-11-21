import { Router } from 'express';
import { assignmentController } from './assignment.controller';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
} from './assignment.validator';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/course/:courseId', assignmentController.listByCourse);

router.post(
  '/',
  authorize('instructor', 'admin'),
  validate(createAssignmentSchema),
  assignmentController.create
);

router.patch(
  '/:id',
  authorize('instructor', 'admin'),
  validate(updateAssignmentSchema),
  assignmentController.update
);

router.delete(
  '/:id',
  authorize('instructor', 'admin'),
  assignmentController.remove
);

export default router;
