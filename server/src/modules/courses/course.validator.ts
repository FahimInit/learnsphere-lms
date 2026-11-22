import { z } from 'zod';

const safeUrlSchema = z
  .string()
  .trim()
  .max(1000, 'URL cannot exceed 1000 characters')
  .refine(
    (val) =>
      val === '' ||
      val.startsWith('/uploads/') ||
      /^https?:\/\//i.test(val),
    'URL must start with https://, http://, or /uploads/'
  );

export const catalogQuerySchema = z.object({
  query: z.object({
    q: z.string().max(120).optional(),
    category: z.string().max(100).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    priceType: z.enum(['all', 'free', 'paid']).optional(),
    sort: z
      .enum(['newest', 'popular', 'rating', 'price_asc', 'price_desc'])
      .optional(),
    page: z.coerce.number().int().min(1).max(1000).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
});

const lessonResourceValidator = z.object({
  title: z.string().trim().min(1, 'Resource title is required').max(140),
  fileUrl: safeUrlSchema.refine((val) => val.length > 0, 'Resource file URL is required'),
  fileSize: z.number().nonnegative().optional().default(0),
  mimeType: z.string().trim().optional().default('application/octet-stream'),
});

export const createCourseSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, 'Course title must be at least 3 characters')
      .max(140, 'Course title cannot exceed 140 characters'),
    shortDescription: z
      .string()
      .trim()
      .min(10, 'Short description must be at least 10 characters')
      .max(300, 'Short description cannot exceed 300 characters'),
    fullDescription: z.string().trim().max(15000).optional().default(''),
    category: z.string().trim().min(1, 'Category ID is required'),
    level: z
      .enum(['beginner', 'intermediate', 'advanced'])
      .optional()
      .default('beginner'),
    price: z.coerce.number().min(0, 'Price cannot be negative').optional().default(0),
    thumbnailUrl: safeUrlSchema.optional().default(''),
    previewVideoUrl: safeUrlSchema.optional().default(''),
    tags: z.array(z.string().trim()).optional().default([]),
    prerequisites: z.array(z.string().trim()).optional().default([]),
    learningObjectives: z.array(z.string().trim()).optional().default([]),
    estimatedDurationMinutes: z.coerce.number().min(0).optional().default(0),
  }),
});

export const updateCourseSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    title: z.string().trim().min(3).max(140).optional(),
    shortDescription: z.string().trim().min(10).max(300).optional(),
    fullDescription: z.string().trim().max(15000).optional(),
    category: z.string().trim().min(1).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    price: z.coerce.number().min(0).optional(),
    thumbnailUrl: safeUrlSchema.optional(),
    previewVideoUrl: safeUrlSchema.optional(),
    tags: z.array(z.string().trim()).optional(),
    prerequisites: z.array(z.string().trim()).optional(),
    learningObjectives: z.array(z.string().trim()).optional(),
    estimatedDurationMinutes: z.coerce.number().min(0).optional(),
  }),
});

export const createSectionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    title: z
      .string()
      .trim()
      .min(2, 'Section title must be at least 2 characters')
      .max(140),
    description: z.string().trim().max(1000).optional().default(''),
    order: z.coerce.number().int().min(0).optional(),
  }),
});

export const updateSectionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    sectionId: z.string().min(1),
  }),
  body: z.object({
    title: z.string().trim().min(2).max(140).optional(),
    description: z.string().trim().max(1000).optional(),
    order: z.coerce.number().int().min(0).optional(),
  }),
});

export const reorderSectionsSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    orderedSectionIds: z
      .array(z.string().min(1))
      .min(1, 'At least one section ID is required'),
  }),
});

export const createLessonSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    sectionId: z.string().min(1),
  }),
  body: z.object({
    title: z
      .string()
      .trim()
      .min(2, 'Lesson title must be at least 2 characters')
      .max(160),
    type: z
      .enum(['video', 'text', 'resource', 'embed'])
      .optional()
      .default('video'),
    content: z.string().max(50000).optional().default(''),
    videoUrl: safeUrlSchema.optional().default(''),
    videoDurationSeconds: z.coerce.number().min(0).optional().default(0),
    videoProvider: z
      .enum(['local', 'external', 'mux'])
      .optional()
      .default('external'),
    resources: z.array(lessonResourceValidator).optional().default([]),
    isPreview: z.boolean().optional().default(false),
    order: z.coerce.number().int().min(0).optional(),
  }),
});

export const updateLessonSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    lessonId: z.string().min(1),
  }),
  body: z.object({
    title: z.string().trim().min(2).max(160).optional(),
    type: z.enum(['video', 'text', 'resource', 'embed']).optional(),
    content: z.string().max(50000).optional(),
    videoUrl: safeUrlSchema.optional(),
    videoDurationSeconds: z.coerce.number().min(0).optional(),
    videoProvider: z.enum(['local', 'external', 'mux']).optional(),
    resources: z.array(lessonResourceValidator).optional(),
    isPreview: z.boolean().optional(),
    order: z.coerce.number().int().min(0).optional(),
  }),
});

export const reorderLessonsSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    sectionId: z.string().min(1),
  }),
  body: z.object({
    orderedLessonIds: z
      .array(z.string().min(1))
      .min(1, 'At least one lesson ID is required'),
  }),
});

export const moderateCourseSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    action: z.enum(['approve', 'reject']),
    rejectionReason: z.string().trim().max(1000).optional().default(''),
  }),
});

export const createCourseReviewSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    rating: z.coerce
      .number()
      .int()
      .min(1, 'Rating must be between 1 and 5')
      .max(5, 'Rating must be between 1 and 5'),
    comment: z
      .string()
      .trim()
      .min(3, 'Review comment must be at least 3 characters')
      .max(2000, 'Review comment cannot exceed 2000 characters'),
  }),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>['body'];
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>['body'];
export type CreateSectionInput = z.infer<typeof createSectionSchema>['body'];
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>['body'];
export type CreateLessonInput = z.infer<typeof createLessonSchema>['body'];
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>['body'];
export type ModerateCourseInput = z.infer<typeof moderateCourseSchema>['body'];
export type CreateCourseReviewInput = z.infer<
  typeof createCourseReviewSchema
>['body'];
