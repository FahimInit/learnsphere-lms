import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ILessonProgressDocument extends Document {
  enrollment: Types.ObjectId;
  student: Types.ObjectId;
  course: Types.ObjectId;
  lesson: Types.ObjectId;
  isCompleted: boolean;
  completedAt?: Date;
  watchTimeSeconds: number;
  lastPositionSeconds: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const lessonProgressSchema = new Schema<ILessonProgressDocument>(
  {
    enrollment: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
      index: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    watchTimeSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPositionSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 10000,
    },
  },
  {
    timestamps: true,
  }
);

lessonProgressSchema.index({ student: 1, lesson: 1 }, { unique: true });
lessonProgressSchema.index({ enrollment: 1, isCompleted: 1 });

export const LessonProgress: Model<ILessonProgressDocument> =
  mongoose.models.LessonProgress ||
  mongoose.model<ILessonProgressDocument>(
    'LessonProgress',
    lessonProgressSchema
  );
