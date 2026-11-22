import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type AuditAction =
  | 'USER_SUSPENDED'
  | 'USER_ACTIVATED'
  | 'ROLE_CHANGED'
  | 'COURSE_APPROVED'
  | 'COURSE_REJECTED'
  | 'CONTENT_DISMISSED'
  | 'CONTENT_REMOVED'
  | 'SETTINGS_UPDATED';

export interface IAuditLogDocument extends Document {
  actor: Types.ObjectId;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'USER_SUSPENDED',
        'USER_ACTIVATED',
        'ROLE_CHANGED',
        'COURSE_APPROVED',
        'COURSE_REJECTED',
        'CONTENT_DISMISSED',
        'CONTENT_REMOVED',
        'SETTINGS_UPDATED',
      ],
      required: true,
    },
    targetType: {
      type: String,
      required: true,
      trim: true,
    },
    targetId: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);

export interface IPlatformSettingsDocument extends Document {
  key: string;
  platformName: string;
  supportEmail: string;
  allowInstructorSignup: boolean;
  requireCourseApproval: boolean;
  announcementBanner: string;
  updatedAt: Date;
}

const platformSettingsSchema = new Schema<IPlatformSettingsDocument>(
  {
    key: { type: String, unique: true, default: 'global' },
    platformName: { type: String, default: 'LearnSphere', maxlength: 100 },
    supportEmail: {
      type: String,
      default: 'support@learnsphere.local',
      maxlength: 160,
    },
    allowInstructorSignup: { type: Boolean, default: true },
    requireCourseApproval: { type: Boolean, default: true },
    announcementBanner: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

export const PlatformSettings: Model<IPlatformSettingsDocument> =
  mongoose.models.PlatformSettings ||
  mongoose.model<IPlatformSettingsDocument>(
    'PlatformSettings',
    platformSettingsSchema
  );
