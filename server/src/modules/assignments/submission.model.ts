import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type SubmissionStatus =
  | 'submitted'
  | 'graded'
  | 'returned_for_revision';

export interface SubmissionAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface GradeHistoryEntry {
  grade: number;
  feedback: string;
  gradedBy: Types.ObjectId;
  gradedAt: Date;
  submissionNumber: number;
}

export interface ISubmissionDocument extends Document {
  assignment: Types.ObjectId;
  course: Types.ObjectId;
  student: Types.ObjectId;
  textResponse: string;
  attachments: SubmissionAttachment[];
  status: SubmissionStatus;
  grade: number | null;
  feedback: string;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  submissionCount: number;
  submittedAt: Date;
  gradeHistory: GradeHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const submissionAttachmentSchema = new Schema<SubmissionAttachment>(
  {
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    fileSize: { type: Number, default: 0, min: 0 },
    mimeType: { type: String, default: 'application/octet-stream' },
  },
  { _id: false }
);

const gradeHistorySchema = new Schema<GradeHistoryEntry>(
  {
    grade: { type: Number, required: true, min: 0 },
    feedback: { type: String, default: '' },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gradedAt: { type: Date, default: Date.now },
    submissionNumber: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const submissionSchema = new Schema<ISubmissionDocument>(
  {
    assignment: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
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
    textResponse: {
      type: String,
      default: '',
      maxlength: 20000,
    },
    attachments: {
      type: [submissionAttachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['submitted', 'graded', 'returned_for_revision'],
      default: 'submitted',
    },
    grade: {
      type: Number,
      default: null,
      min: 0,
    },
    feedback: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    gradedAt: {
      type: Date,
    },
    submissionCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    gradeHistory: {
      type: [gradeHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
submissionSchema.index({ course: 1, status: 1 });

export const Submission: Model<ISubmissionDocument> =
  mongoose.models.Submission ||
  mongoose.model<ISubmissionDocument>('Submission', submissionSchema);
