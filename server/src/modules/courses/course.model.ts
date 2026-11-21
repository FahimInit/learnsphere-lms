import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type CourseStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ICourseDocument extends Document {
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  thumbnailUrl: string;
  previewVideoUrl: string;
  instructor: Types.ObjectId;
  category: Types.ObjectId;
  tags: string[];
  level: CourseLevel;
  price: number;
  prerequisites: string[];
  learningObjectives: string[];
  estimatedDurationMinutes: number;
  status: CourseStatus;
  rejectionReason: string;
  publishedAt?: Date;
  enrollmentCount: number;
  averageRating: number;
  reviewCount: number;
  totalLessonsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourseDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 140,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    fullDescription: {
      type: String,
      default: '',
      maxlength: 15000,
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    previewVideoUrl: {
      type: String,
      default: '',
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    prerequisites: {
      type: [String],
      default: [],
    },
    learningObjectives: {
      type: [String],
      default: [],
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published', 'rejected', 'archived'],
      default: 'draft',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    publishedAt: {
      type: Date,
    },
    enrollmentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalLessonsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.index({ status: 1, category: 1, level: 1, price: 1 });
courseSchema.index({ instructor: 1, status: 1 });
courseSchema.index({ title: 'text', shortDescription: 'text', tags: 'text' });

export const Course: Model<ICourseDocument> =
  mongoose.models.Course || mongoose.model<ICourseDocument>('Course', courseSchema);
