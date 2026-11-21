import { Router } from 'express';
import { quizController } from './quiz.controller';
import {
  createQuizSchema,
  updateQuizSchema,
  createQuestionSchema,
  updateQuestionSchema,
  submitQuizAttemptSchema,
} from './quiz.validator';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/course/:courseId', quizController.listByCourse);
router.get('/:id', quizController.getOne);

router.post(
  '/',
  authorize('instructor', 'admin'),
  validate(createQuizSchema),
  quizController.create
);

router.patch(
  '/:id',
  authorize('instructor', 'admin'),
  validate(updateQuizSchema),
  quizController.update
);

router.delete(
  '/:id',
  authorize('instructor', 'admin'),
  quizController.remove
);

router.post(
  '/:id/questions',
  authorize('instructor', 'admin'),
  validate(createQuestionSchema),
  quizController.addQuestion
);

router.patch(
  '/:id/questions/:questionId',
  authorize('instructor', 'admin'),
  validate(updateQuestionSchema),
  quizController.updateQuestion
);

router.delete(
  '/:id/questions/:questionId',
  authorize('instructor', 'admin'),
  quizController.deleteQuestion
);

router.post(
  '/:id/attempts',
  validate(submitQuizAttemptSchema),
  quizController.submitAttempt
);

router.get('/:id/attempts', quizController.getAttempts);

export default router;
