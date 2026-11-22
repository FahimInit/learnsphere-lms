import mongoose from 'mongoose';
import {
  Notification,
  INotificationDocument,
  NotificationType,
} from './notification.model';
import { emitToUser } from '../../infrastructure/socket/socket.service';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta, PaginationMeta } from '../../utils/apiResponse';

export interface CreateNotificationPayload {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
}

export class NotificationService {
  async createAndDispatch(
    payload: CreateNotificationPayload
  ): Promise<INotificationDocument> {
    const notification = await Notification.create({
      recipient: payload.recipientId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      linkUrl: payload.linkUrl ?? '',
      isRead: false,
    });

    emitToUser(payload.recipientId, 'notification:new', {
      notification: notification.toObject(),
    });

    return notification;
  }

  async dispatchBulk(
    recipientIds: string[],
    payload: Omit<CreateNotificationPayload, 'recipientId'>
  ): Promise<number> {
    const uniqueIds = Array.from(new Set(recipientIds));
    if (uniqueIds.length === 0) return 0;

    const docs = await Notification.insertMany(
      uniqueIds.map((id) => ({
        recipient: id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        linkUrl: payload.linkUrl ?? '',
        isRead: false,
      }))
    );

    for (const doc of docs) {
      emitToUser(doc.recipient.toString(), 'notification:new', {
        notification: doc.toObject(),
      });
    }

    return docs.length;
  }

  async listUserNotifications(
    userId: string,
    options: { unreadOnly?: boolean; page?: number; limit?: number } = {}
  ): Promise<{
    notifications: INotificationDocument[];
    unreadCount: number;
    meta: PaginationMeta;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { recipient: userId };
    if (options.unreadOnly) {
      filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<INotificationDocument> {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw AppError.badRequest('Invalid notification ID');
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw AppError.notFound('Notification not found');
    }

    if (notification.recipient.toString() !== userId) {
      throw AppError.forbidden(
        'You do not have permission to update this notification'
      );
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return { modifiedCount: result.modifiedCount };
  }
}

export const notificationService = new NotificationService();
