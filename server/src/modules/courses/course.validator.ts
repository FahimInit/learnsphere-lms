import { z } from 'zod';

const lessonResourceValidator = z.object({
  title: z.string().trim().min(1, 'Resource title is required').max(140),
  fileUrl: z.string().trim().min(1, 'Resource file URL is required'),
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
    thumbnailUrl: z.string().trim().optional().default(''),
    previewVideoUrl: z.string().trim().optional().default(''),
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
    thumbnailUrl: z.string().trim().optional(),
    previewVideoUrl: z.string().trim().optional(),
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
    videoUrl: z.string().trim().optional().default(''),
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
    videoUrl: z.string().trim().optional(),
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

export type CreateCourseInput = z.infer<typeof createCourseSchema>['body'];
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>['body'];
export type CreateSectionInput = z.infer<typeof createSectionSchema>['body'];
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>['body'];
export type CreateLessonInput = z.infer<typeof createLessonSchema>['body'];
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>['body'];
export type ModerateCourseInput = z.infer<typeof moderateCourseSchema>['body'];
