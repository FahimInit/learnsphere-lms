import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters')
      .optional(),
    headline: z
      .string()
      .trim()
      .max(160, 'Headline cannot exceed 160 characters')
      .optional(),
    bio: z.string().trim().max(2000, 'Bio cannot exceed 2000 characters').optional(),
    avatarUrl: z
      .string()
      .trim()
      .max(500, 'Avatar URL cannot exceed 500 characters')
      .optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(72, 'New password cannot exceed 72 characters')
      .regex(/[A-Za-z]/, 'New password must contain at least one letter')
      .regex(/[0-9]/, 'New password must contain at least one number'),
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
