import { Request, Response } from 'express';
import { progressService } from './progress.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class ProgressController {
  toggleLessonCompletion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await progressService.toggleLessonCompletion(
      req.params.lessonId,
      req.user,
      req.body?.isCompleted
    );
    return sendSuccess(
      res,
      result,
      result.lessonProgress.isCompleted
        ? 'Lesson marked as completed'
        : 'Lesson marked as incomplete'
    );
  });

  updateLessonState = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await progressService.updateLessonState(
      req.params.lessonId,
      req.user,
      req.body
    );
    return sendSuccess(res, result, 'Lesson progress state saved');
  });
}

export const progressController = new ProgressController();
