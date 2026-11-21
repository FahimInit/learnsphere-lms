import { Router } from 'express';
import { assignmentController } from './assignment.controller';
import {
  submitAssignmentSchema,
  gradeSubmissionSchema,
} from './assignment.validator';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadSingleFile } from '../../middleware/upload';

const router = Router();

router.use(authenticate);

router.post(
  '/assignments/:assignmentId/upload',
  uploadSingleFile,
  assignmentController.uploadAttachment
);

router.post(
  '/assignments/:assignmentId',
  validate(submitAssignmentSchema),
  assignmentController.submit
);

router.get(
  '/assignments/:assignmentId/my-submission',
  assignmentController.getMySubmission
);

router.get(
  '/assignments/:assignmentId',
  authorize('instructor', 'admin'),
  assignmentController.listSubmissions
);

router.patch(
  '/:submissionId/grade',
  authorize('instructor', 'admin'),
  validate(gradeSubmissionSchema),
  assignmentController.gradeSubmission
);

export default router;
