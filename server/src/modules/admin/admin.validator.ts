import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['active', 'suspended']),
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    role: z.enum(['student', 'instructor', 'admin']),
  }),
});

export const moderateReportedContentSchema = z.object({
  params: z.object({
    type: z.enum(['discussion', 'comment']),
    id: z.string().min(1),
  }),
  body: z.object({
    action: z.enum(['dismiss', 'remove']),
  }),
});

export const updatePlatformSettingsSchema = z.object({
  body: z.object({
    platformName: z.string().trim().min(2).max(100).optional(),
    supportEmail: z.string().trim().email().max(160).optional(),
    allowInstructorSignup: z.boolean().optional(),
    requireCourseApproval: z.boolean().optional(),
    announcementBanner: z.string().trim().max(500).optional(),
  }),
});

export type UpdatePlatformSettingsInput = z.infer<
  typeof updatePlatformSettingsSchema
>['body'];
