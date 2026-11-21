import { Router } from 'express';
import { progressController } from './progress.controller';
import {
  toggleLessonCompletionSchema,
  updateLessonStateSchema,
} from './progress.validator';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(authenticate);

router.post(
  '/lessons/:lessonId/toggle',
  validate(toggleLessonCompletionSchema),
  progressController.toggleLessonCompletion
);

router.patch(
  '/lessons/:lessonId/state',
  validate(updateLessonStateSchema),
  progressController.updateLessonState
);

export default router;
