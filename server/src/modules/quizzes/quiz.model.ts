import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IQuizDocument extends Document {
  course: Types.ObjectId;
  section?: Types.ObjectId;
  lesson?: Types.ObjectId;
  title: string;
  description: string;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  passingScorePercentage: number;
  isPublished: boolean;
  totalPoints: number;
  questionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuizDocument>(
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
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    description: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    timeLimitMinutes: {
      type: Number,
      default: null,
      min: 1,
      max: 300,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
      max: 100,
    },
    passingScorePercentage: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

quizSchema.index({ course: 1, isPublished: 1 });

export const Quiz: Model<IQuizDocument> =
  mongoose.models.Quiz || mongoose.model<IQuizDocument>('Quiz', quizSchema);
