import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface QuizAttemptAnswer {
  question: Types.ObjectId;
  selectedOptionIds: string[];
  isCorrect: boolean;
  pointsAwarded: number;
}

export interface IQuizAttemptDocument extends Document {
  quiz: Types.ObjectId;
  course: Types.ObjectId;
  student: Types.ObjectId;
  attemptNumber: number;
  answers: QuizAttemptAnswer[];
  scorePercentage: number;
  earnedPoints: number;
  totalPoints: number;
  passed: boolean;
  startedAt: Date;
  submittedAt: Date;
  durationSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const quizAttemptAnswerSchema = new Schema<QuizAttemptAnswer>(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    selectedOptionIds: {
      type: [String],
      default: [],
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    pointsAwarded: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const quizAttemptSchema = new Schema<IQuizAttemptDocument>(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    answers: {
      type: [quizAttemptAnswerSchema],
      default: [],
    },
    scorePercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    earnedPoints: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPoints: {
      type: Number,
      required: true,
      min: 0,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

quizAttemptSchema.index(
  { quiz: 1, student: 1, attemptNumber: 1 },
  { unique: true }
);
quizAttemptSchema.index({ course: 1, student: 1 });

export const QuizAttempt: Model<IQuizAttemptDocument> =
  mongoose.models.QuizAttempt ||
  mongoose.model<IQuizAttemptDocument>('QuizAttempt', quizAttemptSchema);
