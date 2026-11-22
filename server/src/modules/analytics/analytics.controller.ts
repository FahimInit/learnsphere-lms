import { Request, Response } from 'express';
import { analyticsService } from './analytics.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class AnalyticsController {
  student = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const analytics = await analyticsService.getStudentAnalytics(req.user.id);
    return sendSuccess(res, analytics, 'Student analytics retrieved');
  });

  instructor = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const analytics = await analyticsService.getInstructorAnalytics(
      req.user.id
    );
    return sendSuccess(res, analytics, 'Instructor analytics retrieved');
  });

  admin = asyncHandler(async (_req: Request, res: Response) => {
    const analytics = await analyticsService.getAdminAnalytics();
    return sendSuccess(res, analytics, 'Platform analytics retrieved');
  });
}

export const analyticsController = new AnalyticsController();
