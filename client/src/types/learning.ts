import { CourseItem, SectionItem } from './course';

export type EnrollmentStatus = 'active' | 'completed' | 'cancelled';

export interface EnrollmentItem {
  _id: string;
  student: string;
  course: CourseItem;
  status: EnrollmentStatus;
  progressPercentage: number;
  completedLessonsCount: number;
  lastAccessedLesson?: {
    _id: string;
    title: string;
    slug: string;
    order: number;
  };
  lastAccessedAt: string;
  enrolledAt: string;
  completedAt?: string;
}

export interface CourseReviewItem {
  _id: string;
  course: string;
  student: {
    _id: string;
    name: string;
    avatarUrl?: string;
    headline?: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

export interface LessonProgressEntry {
  isCompleted: boolean;
  notes: string;
  lastPositionSeconds: number;
  watchTimeSeconds: number;
}

export interface LearningWorkspacePayload {
  course: CourseItem;
  enrollment: EnrollmentItem | null;
  sections: SectionItem[];
  progressMap: Record<string, LessonProgressEntry>;
  resumeLessonId: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
