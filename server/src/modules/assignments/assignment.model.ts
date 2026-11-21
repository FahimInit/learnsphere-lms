import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAssignmentDocument extends Document {
  course: Types.ObjectId;
  section?: Types.ObjectId;
  title: string;
  instructions: string;
  dueDate?: Date | null;
  maxScore: number;
  allowResubmission: boolean;
  maxResubmissions: number;
  requiresAttachment: boolean;
  allowedFileTypes: string[];
  maxFileSizeMb: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignmentDocument>(
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
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    instructions: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 15000,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    maxScore: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000,
    },
    allowResubmission: {
      type: Boolean,
      default: true,
    },
    maxResubmissions: {
      type: Number,
      default: 3,
      min: 1,
      max: 20,
    },
    requiresAttachment: {
      type: Boolean,
      default: false,
    },
    allowedFileTypes: {
      type: [String],
      default: ['.pdf', '.zip', '.docx', '.txt', '.md', '.png', '.jpg'],
    },
    maxFileSizeMb: {
      type: Number,
      default: 25,
      min: 1,
      max: 100,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

assignmentSchema.index({ course: 1, isPublished: 1 });

export const Assignment: Model<IAssignmentDocument> =
  mongoose.models.Assignment ||
  mongoose.model<IAssignmentDocument>('Assignment', assignmentSchema);
