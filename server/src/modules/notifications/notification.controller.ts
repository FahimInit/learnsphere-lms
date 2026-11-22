import { Request, Response } from 'express';
import { notificationService } from './notification.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class NotificationController {
  list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const unreadOnly = req.query.unreadOnly === 'true';
    const page = parseInt(String(req.query.page || '1'), 10) || 1;
    const limit = parseInt(String(req.query.limit || '20'), 10) || 20;

    const result = await notificationService.listUserNotifications(
      req.user.id,
      { unreadOnly, page, limit }
    );

    return sendSuccess(
      res,
      {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
      },
      'Notifications retrieved successfully',
      200,
      result.meta
    );
  });

  markRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user.id
    );
    return sendSuccess(res, { notification }, 'Notification marked as read');
  });

  markAllRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await notificationService.markAllAsRead(req.user.id);
    return sendSuccess(
      res,
      result,
      'All notifications marked as read'
    );
  });
}

export const notificationController = new NotificationController();
