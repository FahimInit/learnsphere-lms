import { Request, Response } from 'express';
import { authService } from './auth.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import {
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../../utils/jwt';
import { AppError } from '../../utils/AppError';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    setRefreshTokenCookie(res, result.refreshToken);

    return sendCreated(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      'Account registered successfully'
    );
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    setRefreshTokenCookie(res, result.refreshToken);

    return sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      'Logged in successfully'
    );
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const rawRefreshToken =
      req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const result = await authService.refreshSession(rawRefreshToken);
    setRefreshTokenCookie(res, result.refreshToken);

    return sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      'Session refreshed successfully'
    );
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const rawRefreshToken =
      req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    await authService.logout(rawRefreshToken);
    clearRefreshTokenCookie(res);

    return sendSuccess(res, null, 'Logged out successfully');
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body);
    return sendSuccess(
      res,
      result,
      'If an account exists for that email, a password reset link has been sent'
    );
  });

  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    clearRefreshTokenCookie(res);
    return sendSuccess(
      res,
      null,
      'Password has been reset successfully. Please log in with your new password.'
    );
  });

  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.verifyEmail(req.body.token);
    return sendSuccess(res, { user }, 'Email verified successfully');
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    const user = await authService.getCurrentUser(req.user.id);
    return sendSuccess(res, { user }, 'Authenticated user profile retrieved');
  });
}

export const authController = new AuthController();
