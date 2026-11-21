import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type QuestionType = 'mcq' | 'multi_select' | 'true_false';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface IQuestionDocument extends Document {
  quiz: Types.ObjectId;
  type: QuestionType;
  prompt: string;
  options: QuestionOption[];
  correctOptionIds: string[];
  points: number;
  explanation: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const questionOptionSchema = new Schema<QuestionOption>(
  {
    id: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const questionSchema = new Schema<IQuestionDocument>(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['mcq', 'multi_select', 'true_false'],
      required: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 2000,
    },
    options: {
      type: [questionOptionSchema],
      required: true,
      validate: {
        validator: (opts: QuestionOption[]) => opts.length >= 2 && opts.length <= 8,
        message: 'A question must have between 2 and 8 options',
      },
    },
    correctOptionIds: {
      type: [String],
      required: true,
      validate: {
        validator: (ids: string[]) => ids.length >= 1,
        message: 'At least one correct option ID must be specified',
      },
    },
    points: {
      type: Number,
      default: 1,
      min: 1,
      max: 100,
    },
    explanation: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ quiz: 1, order: 1 });

export const Question: Model<IQuestionDocument> =
  mongoose.models.Question ||
  mongoose.model<IQuestionDocument>('Question', questionSchema);
