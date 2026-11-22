export type NotificationType =
  | 'enrollment'
  | 'announcement'
  | 'assignment_graded'
  | 'quiz_result'
  | 'course_status'
  | 'certificate_issued'
  | 'discussion_reply'
  | 'system';

export interface NotificationItem {
  _id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface CommunityAuthor {
  _id: string;
  name: string;
  role?: 'student' | 'instructor' | 'admin';
  avatarUrl?: string;
  headline?: string;
}

export interface DiscussionItem {
  _id: string;
  course: string;
  lesson?: string;
  author: CommunityAuthor;
  title: string;
  content: string;
  isPinned: boolean;
  isResolved: boolean;
  replyCount: number;
  isReported: boolean;
  createdAt: string;
}

export interface CommentItem {
  _id: string;
  discussion: string;
  author: CommunityAuthor;
  content: string;
  isInstructorReply: boolean;
  isReported: boolean;
  createdAt: string;
}

export interface AnnouncementItem {
  _id: string;
  course: string;
  instructor: CommunityAuthor;
  title: string;
  content: string;
  createdAt: string;
}
