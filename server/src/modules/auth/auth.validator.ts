import { z } from 'zod';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password cannot exceed 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
    password: passwordRule,
    role: z.enum(['student', 'instructor']).optional().default('student'),
    headline: z.string().trim().max(160).optional().default(''),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().trim().min(16, 'Invalid reset token'),
    password: passwordRule,
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().trim().min(16, 'Invalid verification token'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
