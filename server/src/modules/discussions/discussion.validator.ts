import { z } from 'zod';

export const createDiscussionSchema = z.object({
  params: z.object({
    courseId: z.string().min(1),
  }),
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, 'Discussion title must be at least 3 characters')
      .max(200),
    content: z
      .string()
      .trim()
      .min(3, 'Discussion content must be at least 3 characters')
      .max(10000),
    lessonId: z.string().optional(),
  }),
});

export const createCommentSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1, 'Reply cannot be empty')
      .max(5000),
  }),
});

export const updateDiscussionStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    isPinned: z.boolean().optional(),
    isResolved: z.boolean().optional(),
  }),
});

export const reportContentSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(5, 'Please provide a brief reason (min 5 characters)')
      .max(500),
  }),
});

export const createAnnouncementSchema = z.object({
  params: z.object({
    courseId: z.string().min(1),
  }),
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, 'Announcement title must be at least 3 characters')
      .max(200),
    content: z
      .string()
      .trim()
      .min(5, 'Announcement content must be at least 5 characters')
      .max(10000),
  }),
});

export type CreateDiscussionInput = z.infer<
  typeof createDiscussionSchema
>['body'];
export type CreateCommentInput = z.infer<typeof createCommentSchema>['body'];
export type UpdateDiscussionStatusInput = z.infer<
  typeof updateDiscussionStatusSchema
>['body'];
export type ReportContentInput = z.infer<typeof reportContentSchema>['body'];
export type CreateAnnouncementInput = z.infer<
  typeof createAnnouncementSchema
>['body'];
