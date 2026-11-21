import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Category name must be at least 2 characters')
      .max(80, 'Category name cannot exceed 80 characters'),
    description: z.string().trim().max(500).optional().default(''),
    icon: z.string().trim().max(60).optional().default('BookOpen'),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(500).optional(),
    icon: z.string().trim().max(60).optional(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];
