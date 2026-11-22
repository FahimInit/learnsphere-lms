import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAnnouncementDocument extends Document {
  course: Types.ObjectId;
  instructor: Types.ObjectId;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncementDocument>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
      minlength: 5,
      maxlength: 10000,
    },
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ course: 1, createdAt: -1 });

export const Announcement: Model<IAnnouncementDocument> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncementDocument>('Announcement', announcementSchema);
