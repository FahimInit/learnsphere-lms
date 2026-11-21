import { z } from 'zod';

const questionOptionSchema = z.object({
  id: z.string().trim().min(1, 'Option ID is required'),
  text: z.string().trim().min(1, 'Option text is required').max(500),
});

export const createQuizSchema = z.object({
  body: z.object({
    courseId: z.string().min(1, 'Course ID is required'),
    sectionId: z.string().optional(),
    lessonId: z.string().optional(),
    title: z
      .string()
      .trim()
      .min(2, 'Quiz title must be at least 2 characters')
      .max(160),
    description: z.string().trim().max(2000).optional().default(''),
    timeLimitMinutes: z.coerce
      .number()
      .int()
      .min(1)
      .max(300)
      .nullable()
      .optional()
      .default(null),
    maxAttempts: z.coerce.number().int().min(1).max(100).optional().default(3),
    passingScorePercentage: z.coerce
      .number()
      .min(0)
      .max(100)
      .optional()
      .default(70),
    isPublished: z.boolean().optional().default(true),
  }),
});

export const updateQuizSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    title: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(2000).optional(),
    timeLimitMinutes: z.coerce
      .number()
      .int()
      .min(1)
      .max(300)
      .nullable()
      .optional(),
    maxAttempts: z.coerce.number().int().min(1).max(100).optional(),
    passingScorePercentage: z.coerce.number().min(0).max(100).optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const createQuestionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      type: z.enum(['mcq', 'multi_select', 'true_false']),
      prompt: z
        .string()
        .trim()
        .min(3, 'Question prompt must be at least 3 characters')
        .max(2000),
      options: z
        .array(questionOptionSchema)
        .min(2, 'At least 2 options are required')
        .max(8, 'Cannot exceed 8 options'),
      correctOptionIds: z
        .array(z.string().trim().min(1))
        .min(1, 'At least 1 correct option must be selected'),
      points: z.coerce.number().int().min(1).max(100).optional().default(1),
      explanation: z.string().trim().max(2000).optional().default(''),
      order: z.coerce.number().int().min(0).optional(),
    })
    .superRefine((data, ctx) => {
      const optionIds = new Set(data.options.map((o) => o.id));
      for (const cid of data.correctOptionIds) {
        if (!optionIds.has(cid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['correctOptionIds'],
            message: `Correct option ID '${cid}' does not exist in options`,
          });
        }
      }
      if (
        (data.type === 'mcq' || data.type === 'true_false') &&
        data.correctOptionIds.length !== 1
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctOptionIds'],
          message: `${data.type} questions must have exactly 1 correct option`,
        });
      }
    }),
});

export const updateQuestionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    questionId: z.string().min(1),
  }),
  body: z.object({
    type: z.enum(['mcq', 'multi_select', 'true_false']).optional(),
    prompt: z.string().trim().min(3).max(2000).optional(),
    options: z.array(questionOptionSchema).min(2).max(8).optional(),
    correctOptionIds: z.array(z.string().trim().min(1)).min(1).optional(),
    points: z.coerce.number().int().min(1).max(100).optional(),
    explanation: z.string().trim().max(2000).optional(),
    order: z.coerce.number().int().min(0).optional(),
  }),
});

export const submitQuizAttemptSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    answers: z.array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionIds: z.array(z.string()).default([]),
      })
    ),
    startedAt: z.string().datetime().optional(),
  }),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>['body'];
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>['body'];
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>['body'];
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>['body'];
export type SubmitQuizAttemptInput = z.infer<
  typeof submitQuizAttemptSchema
>['body'];
