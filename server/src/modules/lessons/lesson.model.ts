import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type LessonType = 'video' | 'text' | 'resource' | 'embed';
export type VideoProvider = 'local' | 'external' | 'mux';

export interface LessonResource {
  title: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface ILessonDocument extends Document {
  course: Types.ObjectId;
  section: Types.ObjectId;
  title: string;
  slug: string;
  type: LessonType;
  content: string;
  videoUrl: string;
  videoDurationSeconds: number;
  videoProvider: VideoProvider;
  resources: LessonResource[];
  isPreview: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const lessonResourceSchema = new Schema<LessonResource>(
  {
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: 'application/octet-stream' },
  },
  { _id: false }
);

const lessonSchema = new Schema<ILessonDocument>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['video', 'text', 'resource', 'embed'],
      default: 'video',
    },
    content: {
      type: String,
      default: '',
      maxlength: 50000,
    },
    videoUrl: {
      type: String,
      default: '',
    },
    videoDurationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    videoProvider: {
      type: String,
      enum: ['local', 'external', 'mux'],
      default: 'external',
    },
    resources: {
      type: [lessonResourceSchema],
      default: [],
    },
    isPreview: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

lessonSchema.index({ section: 1, order: 1 });
lessonSchema.index({ course: 1, order: 1 });

export const Lesson: Model<ILessonDocument> =
  mongoose.models.Lesson || mongoose.model<ILessonDocument>('Lesson', lessonSchema);
