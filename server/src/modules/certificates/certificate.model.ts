import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICertificateDocument extends Document {
  certificateCode: string;
  student: Types.ObjectId;
  course: Types.ObjectId;
  enrollment: Types.ObjectId;
  studentNameSnapshot: string;
  courseTitleSnapshot: string;
  instructorNameSnapshot: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificateDocument>(
  {
    certificateCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
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
    enrollment: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
    },
    studentNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    courseTitleSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    instructorNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

certificateSchema.index({ student: 1, course: 1 }, { unique: true });

export const Certificate: Model<ICertificateDocument> =
  mongoose.models.Certificate ||
  mongoose.model<ICertificateDocument>('Certificate', certificateSchema);
