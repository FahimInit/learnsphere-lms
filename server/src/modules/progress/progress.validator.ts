import { z } from 'zod';

export const toggleLessonCompletionSchema = z.object({
  params: z.object({
    lessonId: z.string().min(1),
  }),
  body: z.object({
    isCompleted: z.boolean().optional(),
  }),
});

export const updateLessonStateSchema = z.object({
  params: z.object({
    lessonId: z.string().min(1),
  }),
  body: z.object({
    notes: z.string().max(10000).optional(),
    lastPositionSeconds: z.coerce.number().min(0).optional(),
    watchTimeDeltaSeconds: z.coerce.number().min(0).optional(),
  }),
});

export type UpdateLessonStateInput = z.infer<
  typeof updateLessonStateSchema
>['body'];
