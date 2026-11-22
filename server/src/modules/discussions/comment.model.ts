import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICommentDocument extends Document {
  discussion: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  isInstructorReply: boolean;
  isReported: boolean;
  reportReason: string;
  reportedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<ICommentDocument>(
  {
    discussion: {
      type: Schema.Types.ObjectId,
      ref: 'Discussion',
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },
    isInstructorReply: {
      type: Boolean,
      default: false,
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

commentSchema.index({ discussion: 1, createdAt: 1 });
commentSchema.index({ isReported: 1 });

export const Comment: Model<ICommentDocument> =
  mongoose.models.Comment ||
  mongoose.model<ICommentDocument>('Comment', commentSchema);
