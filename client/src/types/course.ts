export type CourseStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type LessonType = 'video' | 'text' | 'resource' | 'embed';

export interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  isActive: boolean;
  courseCount: number;
}

export interface InstructorSummary {
  _id: string;
  name: string;
  email?: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface CourseItem {
  _id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  thumbnailUrl: string;
  previewVideoUrl: string;
  instructor: InstructorSummary;
  category: CategoryItem;
  tags: string[];
  level: CourseLevel;
  price: number;
  prerequisites: string[];
  learningObjectives: string[];
  estimatedDurationMinutes: number;
  status: CourseStatus;
  rejectionReason: string;
  publishedAt?: string;
  enrollmentCount: number;
  averageRating: number;
  reviewCount: number;
  totalLessonsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonResourceItem {
  title: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface LessonItem {
  _id: string;
  course: string;
  section: string;
  title: string;
  slug: string;
  type: LessonType;
  content?: string;
  videoUrl?: string;
  videoDurationSeconds: number;
  videoProvider?: 'local' | 'external' | 'mux';
  resources?: LessonResourceItem[];
  isPreview: boolean;
  order: number;
}

export interface SectionItem {
  _id: string;
  course: string;
  title: string;
  description: string;
  order: number;
  lessons: LessonItem[];
}
