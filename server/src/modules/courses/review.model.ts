import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICourseReviewDocument extends Document {
  course: Types.ObjectId;
  student: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const courseReviewSchema = new Schema<ICourseReviewDocument>(
  {
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

courseReviewSchema.index({ course: 1, student: 1 }, { unique: true });

export const CourseReview: Model<ICourseReviewDocument> =
  mongoose.models.CourseReview ||
  mongoose.model<ICourseReviewDocument>('CourseReview', courseReviewSchema);
