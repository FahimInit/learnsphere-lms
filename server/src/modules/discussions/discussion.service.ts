import mongoose from 'mongoose';
import { Discussion, IDiscussionDocument } from './discussion.model';
import { Comment, ICommentDocument } from './comment.model';
import { Announcement, IAnnouncementDocument } from './announcement.model';
import { Course, ICourseDocument } from '../courses/course.model';
import { Enrollment } from '../enrollments/enrollment.model';
import { courseService } from '../courses/course.service';
import { notificationService } from '../notifications/notification.service';
import { emitToCourse } from '../../infrastructure/socket/socket.service';
import { AppError } from '../../utils/AppError';
import { AuthenticatedUser } from '../../types/express';
import {
  CreateDiscussionInput,
  CreateCommentInput,
  UpdateDiscussionStatusInput,
  ReportContentInput,
  CreateAnnouncementInput,
} from './discussion.validator';

export class DiscussionService {
  private async assertCommunityAccess(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<{ course: ICourseDocument; isPrivileged: boolean }> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const isPrivileged =
      actor.role === 'admin' || course.instructor.toString() === actor.id;

    if (isPrivileged) {
      return { course, isPrivileged: true };
    }

    const enrollment = await Enrollment.findOne({
      student: actor.id,
      course: course._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      throw AppError.forbidden(
        'You must be enrolled in this course to access discussions and announcements'
      );
    }

    return { course, isPrivileged: false };
  }

  async listCourseCommunity(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<{
    discussions: IDiscussionDocument[];
    announcements: IAnnouncementDocument[];
  }> {
    await this.assertCommunityAccess(courseId, actor);

    const [discussions, announcements] = await Promise.all([
      Discussion.find({ course: courseId })
        .populate('author', 'name role avatarUrl headline')
        .sort({ isPinned: -1, createdAt: -1 }),
      Announcement.find({ course: courseId })
        .populate('instructor', 'name avatarUrl headline')
        .sort({ createdAt: -1 }),
    ]);

    return { discussions, announcements };
  }

  async getDiscussionThread(
    discussionId: string,
    actor: AuthenticatedUser
  ): Promise<{
    discussion: IDiscussionDocument;
    comments: ICommentDocument[];
  }> {
    if (!mongoose.Types.ObjectId.isValid(discussionId)) {
      throw AppError.badRequest('Invalid discussion ID');
    }

    const discussion = await Discussion.findById(discussionId).populate(
      'author',
      'name role avatarUrl headline'
    );
    if (!discussion) {
      throw AppError.notFound('Discussion thread not found');
    }

    await this.assertCommunityAccess(discussion.course.toString(), actor);

    const comments = await Comment.find({ discussion: discussion._id })
      .populate('author', 'name role avatarUrl headline')
      .sort({ createdAt: 1 });

    return { discussion, comments };
  }

  async createDiscussion(
    courseId: string,
    actor: AuthenticatedUser,
    input: CreateDiscussionInput
  ): Promise<IDiscussionDocument> {
    const { course, isPrivileged } = await this.assertCommunityAccess(
      courseId,
      actor
    );

    const discussion = await Discussion.create({
      course: course._id,
      lesson:
        input.lessonId && mongoose.Types.ObjectId.isValid(input.lessonId)
          ? input.lessonId
          : undefined,
      author: actor.id,
      title: input.title,
      content: input.content,
    });

    if (!isPrivileged && course.instructor.toString() !== actor.id) {
      await notificationService.createAndDispatch({
        recipientId: course.instructor.toString(),
        type: 'discussion_reply',
        title: 'New Course Question Posted',
        message: `${actor.name} started a discussion "${discussion.title}" in "${course.title}".`,
        linkUrl: `/learn/${course._id.toString()}`,
      });
    }

    return discussion.populate('author', 'name role avatarUrl headline');
  }

  async addComment(
    discussionId: string,
    actor: AuthenticatedUser,
    input: CreateCommentInput
  ): Promise<ICommentDocument> {
    if (!mongoose.Types.ObjectId.isValid(discussionId)) {
      throw AppError.badRequest('Invalid discussion ID');
    }

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      throw AppError.notFound('Discussion thread not found');
    }

    const { course, isPrivileged } = await this.assertCommunityAccess(
      discussion.course.toString(),
      actor
    );

    const comment = await Comment.create({
      discussion: discussion._id,
      author: actor.id,
      content: input.content,
      isInstructorReply: isPrivileged,
    });

    discussion.replyCount += 1;
    await discussion.save();

    if (discussion.author.toString() !== actor.id) {
      await notificationService.createAndDispatch({
        recipientId: discussion.author.toString(),
        type: 'discussion_reply',
        title: isPrivileged
          ? 'Instructor Replied to Your Thread'
          : 'New Reply in Discussion',
        message: `${actor.name} replied to "${discussion.title}" in "${course.title}".`,
        linkUrl: `/learn/${course._id.toString()}`,
      });
    }

    return comment.populate('author', 'name role avatarUrl headline');
  }

  async updateDiscussionStatus(
    discussionId: string,
    actor: AuthenticatedUser,
    input: UpdateDiscussionStatusInput
  ): Promise<IDiscussionDocument> {
    if (!mongoose.Types.ObjectId.isValid(discussionId)) {
      throw AppError.badRequest('Invalid discussion ID');
    }

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      throw AppError.notFound('Discussion thread not found');
    }

    await courseService.assertCourseOwnership(
      discussion.course.toString(),
      actor
    );

    if (input.isPinned !== undefined) discussion.isPinned = input.isPinned;
    if (input.isResolved !== undefined) discussion.isResolved = input.isResolved;

    await discussion.save();
    return discussion.populate('author', 'name role avatarUrl headline');
  }

  async deleteDiscussion(
    discussionId: string,
    actor: AuthenticatedUser
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(discussionId)) {
      throw AppError.badRequest('Invalid discussion ID');
    }

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      throw AppError.notFound('Discussion thread not found');
    }

    const course = await Course.findById(discussion.course);
    const isAuthor = discussion.author.toString() === actor.id;
    const isPrivileged =
      actor.role === 'admin' ||
      (course && course.instructor.toString() === actor.id);

    if (!isAuthor && !isPrivileged) {
      throw AppError.forbidden(
        'You do not have permission to delete this discussion'
      );
    }

    await Comment.deleteMany({ discussion: discussion._id });
    await discussion.deleteOne();
  }

  async reportDiscussion(
    discussionId: string,
    actor: AuthenticatedUser,
    input: ReportContentInput
  ): Promise<IDiscussionDocument> {
    if (!mongoose.Types.ObjectId.isValid(discussionId)) {
      throw AppError.badRequest('Invalid discussion ID');
    }

    const discussion = await Discussion.findById(discussionId);
    if (!discussion) {
      throw AppError.notFound('Discussion thread not found');
    }

    await this.assertCommunityAccess(discussion.course.toString(), actor);

    discussion.isReported = true;
    discussion.reportReason = input.reason;
    discussion.reportedBy = new mongoose.Types.ObjectId(actor.id);
    await discussion.save();

    return discussion;
  }

  async reportComment(
    commentId: string,
    actor: AuthenticatedUser,
    input: ReportContentInput
  ): Promise<ICommentDocument> {
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      throw AppError.badRequest('Invalid comment ID');
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw AppError.notFound('Comment not found');
    }

    const discussion = await Discussion.findById(comment.discussion);
    if (!discussion) {
      throw AppError.notFound('Parent discussion not found');
    }

    await this.assertCommunityAccess(discussion.course.toString(), actor);

    comment.isReported = true;
    comment.reportReason = input.reason;
    comment.reportedBy = new mongoose.Types.ObjectId(actor.id);
    await comment.save();

    return comment;
  }

  async createAnnouncement(
    courseId: string,
    actor: AuthenticatedUser,
    input: CreateAnnouncementInput
  ): Promise<IAnnouncementDocument> {
    const course = await courseService.assertCourseOwnership(courseId, actor);

    const announcement = await Announcement.create({
      course: course._id,
      instructor: actor.id,
      title: input.title,
      content: input.content,
    });

    await announcement.populate('instructor', 'name avatarUrl headline');

    const enrollments = await Enrollment.find({
      course: course._id,
      status: { $in: ['active', 'completed'] },
    }).select('student');

    const studentIds = enrollments
      .map((e) => e.student.toString())
      .filter((id) => id !== actor.id);

    if (studentIds.length > 0) {
      await notificationService.dispatchBulk(studentIds, {
        type: 'announcement',
        title: `Announcement: ${announcement.title}`,
        message: `${course.title}: ${announcement.content.slice(0, 140)}`,
        linkUrl: `/learn/${course._id.toString()}`,
      });
    }

    emitToCourse(course._id.toString(), 'announcement:new', {
      announcement: announcement.toObject(),
    });

    return announcement;
  }
}

export const discussionService = new DiscussionService();
