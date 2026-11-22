import mongoose, { FilterQuery } from 'mongoose';
import { User, IUserDocument, PublicUserProfile } from '../users/user.model';
import { Course, CourseStatus, ICourseDocument } from '../courses/course.model';
import { courseService } from '../courses/course.service';
import { Discussion } from '../discussions/discussion.model';
import { Comment } from '../discussions/comment.model';
import {
  AuditLog,
  AuditAction,
  IAuditLogDocument,
  PlatformSettings,
  IPlatformSettingsDocument,
} from './auditLog.model';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta, PaginationMeta } from '../../utils/apiResponse';
import { AuthenticatedUser, UserRole } from '../../types/express';
import { UpdatePlatformSettingsInput } from './admin.validator';

export class AdminService {
  async recordAudit(
    actorId: string,
    action: AuditAction,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
    ipAddress = ''
  ): Promise<IAuditLogDocument> {
    return AuditLog.create({
      actor: actorId,
      action,
      targetType,
      targetId,
      metadata,
      ipAddress,
    });
  }

  async listUsers(query: {
    q?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: PublicUserProfile[]; meta: PaginationMeta }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: FilterQuery<IUserDocument> = {};
    if (query.q && query.q.trim()) {
      const regex = new RegExp(
        query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
      filter.$or = [{ name: regex }, { email: regex }];
    }
    if (query.role && ['student', 'instructor', 'admin'].includes(query.role)) {
      filter.role = query.role;
    }
    if (
      query.status &&
      ['active', 'suspended', 'pending'].includes(query.status)
    ) {
      filter.status = query.status;
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      users: users.map((u) => u.toPublicProfile()),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async updateUserStatus(
    userId: string,
    status: 'active' | 'suspended',
    actor: AuthenticatedUser,
    ipAddress = ''
  ): Promise<PublicUserProfile> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw AppError.badRequest('Invalid user ID');
    }

    if (userId === actor.id && status === 'suspended') {
      throw AppError.badRequest('Administrators cannot suspend their own account');
    }

    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) {
      throw AppError.notFound('User not found');
    }

    user.status = status;
    if (status === 'suspended') {
      user.refreshTokens = [];
    }
    await user.save();

    await this.recordAudit(
      actor.id,
      status === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      'User',
      user._id.toString(),
      { email: user.email, newStatus: status },
      ipAddress
    );

    return user.toPublicProfile();
  }

  async updateUserRole(
    userId: string,
    role: UserRole,
    actor: AuthenticatedUser,
    ipAddress = ''
  ): Promise<PublicUserProfile> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw AppError.badRequest('Invalid user ID');
    }

    if (userId === actor.id && role !== 'admin') {
      throw AppError.badRequest(
        'Administrators cannot demote their own role'
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await this.recordAudit(
      actor.id,
      'ROLE_CHANGED',
      'User',
      user._id.toString(),
      { email: user.email, previousRole, newRole: role },
      ipAddress
    );

    return user.toPublicProfile();
  }

  async listCoursesForModeration(
    status?: CourseStatus
  ): Promise<ICourseDocument[]> {
    const filter: FilterQuery<ICourseDocument> = status
      ? { status }
      : { status: 'pending_review' };

    return Course.find(filter)
      .populate('category', 'name slug')
      .populate('instructor', 'name email headline')
      .sort({ updatedAt: -1 });
  }

  async moderateCourse(
    courseId: string,
    action: 'approve' | 'reject',
    rejectionReason: string,
    actor: AuthenticatedUser,
    ipAddress = ''
  ): Promise<ICourseDocument> {
    const course = await courseService.moderateCourse(courseId, {
      action,
      rejectionReason,
    });

    await this.recordAudit(
      actor.id,
      action === 'approve' ? 'COURSE_APPROVED' : 'COURSE_REJECTED',
      'Course',
      course._id.toString(),
      { title: course.title, rejectionReason },
      ipAddress
    );

    return course;
  }

  async listReportedContent(): Promise<{
    reportedDiscussions: unknown[];
    reportedComments: unknown[];
  }> {
    const [reportedDiscussions, reportedComments] = await Promise.all([
      Discussion.find({ isReported: true })
        .populate('author', 'name email role')
        .populate('course', 'title slug')
        .populate('reportedBy', 'name email')
        .sort({ updatedAt: -1 }),
      Comment.find({ isReported: true })
        .populate('author', 'name email role')
        .populate('reportedBy', 'name email')
        .populate('discussion', 'title course')
        .sort({ updatedAt: -1 }),
    ]);

    return {
      reportedDiscussions,
      reportedComments,
    };
  }

  async resolveReportedContent(
    type: 'discussion' | 'comment',
    id: string,
    action: 'dismiss' | 'remove',
    actor: AuthenticatedUser,
    ipAddress = ''
  ): Promise<{ resolved: boolean }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw AppError.badRequest('Invalid content ID');
    }

    if (type === 'discussion') {
      const discussion = await Discussion.findById(id);
      if (!discussion) {
        throw AppError.notFound('Discussion not found');
      }

      if (action === 'dismiss') {
        discussion.isReported = false;
        discussion.reportReason = '';
        discussion.reportedBy = undefined;
        await discussion.save();
      } else {
        await Comment.deleteMany({ discussion: discussion._id });
        await discussion.deleteOne();
      }
    } else {
      const comment = await Comment.findById(id);
      if (!comment) {
        throw AppError.notFound('Comment not found');
      }

      if (action === 'dismiss') {
        comment.isReported = false;
        comment.reportReason = '';
        comment.reportedBy = undefined;
        await comment.save();
      } else {
        await Discussion.findByIdAndUpdate(comment.discussion, {
          $inc: { replyCount: -1 },
        });
        await comment.deleteOne();
      }
    }

    await this.recordAudit(
      actor.id,
      action === 'dismiss' ? 'CONTENT_DISMISSED' : 'CONTENT_REMOVED',
      type === 'discussion' ? 'Discussion' : 'Comment',
      id,
      { action },
      ipAddress
    );

    return { resolved: true };
  }

  async listAuditLogs(
    page = 1,
    limit = 25
  ): Promise<{ logs: IAuditLogDocument[]; meta: PaginationMeta }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('actor', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      AuditLog.countDocuments(),
    ]);

    return {
      logs,
      meta: buildPaginationMeta(safePage, safeLimit, total),
    };
  }

  async getPlatformSettings(): Promise<IPlatformSettingsDocument> {
    let settings = await PlatformSettings.findOne({ key: 'global' });
    if (!settings) {
      settings = await PlatformSettings.create({ key: 'global' });
    }
    return settings;
  }

  async updatePlatformSettings(
    input: UpdatePlatformSettingsInput,
    actor: AuthenticatedUser,
    ipAddress = ''
  ): Promise<IPlatformSettingsDocument> {
    const settings = await this.getPlatformSettings();
    if (input.platformName !== undefined)
      settings.platformName = input.platformName;
    if (input.supportEmail !== undefined)
      settings.supportEmail = input.supportEmail;
    if (input.allowInstructorSignup !== undefined)
      settings.allowInstructorSignup = input.allowInstructorSignup;
    if (input.requireCourseApproval !== undefined)
      settings.requireCourseApproval = input.requireCourseApproval;
    if (input.announcementBanner !== undefined)
      settings.announcementBanner = input.announcementBanner;

    await settings.save();

    await this.recordAudit(
      actor.id,
      'SETTINGS_UPDATED',
      'PlatformSettings',
      settings._id.toString(),
      input as Record<string, unknown>,
      ipAddress
    );

    return settings;
  }
}

export const adminService = new AdminService();
