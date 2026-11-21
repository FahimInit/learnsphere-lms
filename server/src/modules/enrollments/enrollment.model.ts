import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type EnrollmentStatus = 'active' | 'completed' | 'cancelled';

export interface IEnrollmentDocument extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  status: EnrollmentStatus;
  progressPercentage: number;
  completedLessonsCount: number;
  lastAccessedLesson?: Types.ObjectId;
  lastAccessedAt: Date;
  enrolledAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollmentDocument>(
  {
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
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedLessonsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAccessedLesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate enrollments at the database level
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1, status: 1 });

export const Enrollment: Model<IEnrollmentDocument> =
  mongoose.models.Enrollment ||
  mongoose.model<IEnrollmentDocument>('Enrollment', enrollmentSchema);
