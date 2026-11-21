import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISectionDocument extends Document {
  course: Types.ObjectId;
  title: string;
  description: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ISectionDocument>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 140,
    },
    description: {
      type: String,
      default: '',
      maxlength: 1000,
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

sectionSchema.index({ course: 1, order: 1 });

export const Section: Model<ISectionDocument> =
  mongoose.models.Section ||
  mongoose.model<ISectionDocument>('Section', sectionSchema);
