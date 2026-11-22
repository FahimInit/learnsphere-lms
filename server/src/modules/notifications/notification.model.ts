import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type NotificationType =
  | 'enrollment'
  | 'announcement'
  | 'assignment_graded'
  | 'quiz_result'
  | 'course_status'
  | 'certificate_issued'
  | 'discussion_reply'
  | 'system';

export interface INotificationDocument extends Document {
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'enrollment',
        'announcement',
        'assignment_graded',
        'quiz_result',
        'course_status',
        'certificate_issued',
        'discussion_reply',
        'system',
      ],
      default: 'system',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    linkUrl: {
      type: String,
      default: '',
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ||
  mongoose.model<INotificationDocument>('Notification', notificationSchema);
