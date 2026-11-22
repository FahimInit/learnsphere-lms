import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDiscussionDocument extends Document {
  course: Types.ObjectId;
  lesson?: Types.ObjectId;
  author: Types.ObjectId;
  title: string;
  content: string;
  isPinned: boolean;
  isResolved: boolean;
  replyCount: number;
  isReported: boolean;
  reportReason: string;
  reportedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const discussionSchema = new Schema<IDiscussionDocument>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 10000,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isReported: {
      type: Boolean,
      default: false,
    },
    reportReason: {
      type: String,
      default: '',
      maxlength: 500,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

discussionSchema.index({ course: 1, isPinned: -1, createdAt: -1 });
discussionSchema.index({ isReported: 1 });

export const Discussion: Model<IDiscussionDocument> =
  mongoose.models.Discussion ||
  mongoose.model<IDiscussionDocument>('Discussion', discussionSchema);
