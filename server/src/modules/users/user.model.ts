import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole, AccountStatus } from '../../types/express';
import { env } from '../../config/env';

export interface RefreshTokenSession {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface PublicUserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  avatarUrl: string;
  headline: string;
  bio: string;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  avatarUrl: string;
  headline: string;
  bio: string;
  isEmailVerified: boolean;
  emailVerificationTokenHash?: string;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  refreshTokens: RefreshTokenSession[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toPublicProfile(): PublicUserProfile;
}

const refreshTokenSessionSchema = new Schema<RefreshTokenSession>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      default: 'student',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    headline: {
      type: String,
      default: '',
      maxlength: 160,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
    refreshTokens: {
      type: [refreshTokenSessionSchema],
      default: [],
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1, status: 1 });

userSchema.methods.comparePassword = async function (
  this: IUserDocument,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toPublicProfile = function (this: IUserDocument): PublicUserProfile {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    avatarUrl: this.avatarUrl || '',
    headline: this.headline || '',
    bio: this.bio || '',
    isEmailVerified: this.isEmailVerified,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = env.NODE_ENV === 'test' ? 8 : 12;
  return bcrypt.hash(plainPassword, saltRounds);
}

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);
