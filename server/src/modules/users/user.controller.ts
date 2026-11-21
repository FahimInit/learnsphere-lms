import { Request, Response } from 'express';
import { userService } from './user.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class UserController {
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await userService.getProfile(req.user.id);
    return sendSuccess(res, { user }, 'Profile retrieved successfully');
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await userService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, { user }, 'Profile updated successfully');
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await userService.changePassword(req.user.id, req.body);
    return sendSuccess(res, null, 'Password updated successfully');
  });

  becomeInstructor = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await userService.upgradeToInstructor(req.user.id);
    return sendSuccess(
      res,
      result,
      'Your account has been upgraded to Instructor'
    );
  });
}

export const userController = new UserController();
