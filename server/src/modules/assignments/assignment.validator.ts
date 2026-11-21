import { z } from 'zod';

const attachmentSchema = z.object({
  fileName: z.string().trim().min(1),
  fileUrl: z.string().trim().min(1),
  fileSize: z.coerce.number().nonnegative().optional().default(0),
  mimeType: z.string().trim().optional().default('application/octet-stream'),
});

export const createAssignmentSchema = z.object({
  body: z.object({
    courseId: z.string().min(1, 'Course ID is required'),
    sectionId: z.string().optional(),
    title: z
      .string()
      .trim()
      .min(2, 'Assignment title must be at least 2 characters')
      .max(160),
    instructions: z
      .string()
      .trim()
      .min(5, 'Instructions must be at least 5 characters')
      .max(15000),
    dueDate: z.string().datetime().nullable().optional().default(null),
    maxScore: z.coerce.number().int().min(1).max(1000).optional().default(100),
    allowResubmission: z.boolean().optional().default(true),
    maxResubmissions: z.coerce.number().int().min(1).max(20).optional().default(3),
    requiresAttachment: z.boolean().optional().default(false),
    allowedFileTypes: z
      .array(z.string().trim().toLowerCase())
      .optional()
      .default(['.pdf', '.zip', '.docx', '.txt', '.md', '.png', '.jpg']),
    maxFileSizeMb: z.coerce.number().min(1).max(100).optional().default(25),
    isPublished: z.boolean().optional().default(true),
  }),
});

export const updateAssignmentSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    title: z.string().trim().min(2).max(160).optional(),
    instructions: z.string().trim().min(5).max(15000).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    maxScore: z.coerce.number().int().min(1).max(1000).optional(),
    allowResubmission: z.boolean().optional(),
    maxResubmissions: z.coerce.number().int().min(1).max(20).optional(),
    requiresAttachment: z.boolean().optional(),
    allowedFileTypes: z.array(z.string().trim().toLowerCase()).optional(),
    maxFileSizeMb: z.coerce.number().min(1).max(100).optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const submitAssignmentSchema = z.object({
  params: z.object({
    assignmentId: z.string().min(1),
  }),
  body: z.object({
    textResponse: z.string().trim().max(20000).optional().default(''),
    attachments: z.array(attachmentSchema).optional().default([]),
  }),
});

export const gradeSubmissionSchema = z.object({
  params: z.object({
    submissionId: z.string().min(1),
  }),
  body: z.object({
    grade: z.coerce.number().min(0, 'Grade cannot be negative'),
    feedback: z.string().trim().max(5000).optional().default(''),
    status: z
      .enum(['graded', 'returned_for_revision'])
      .optional()
      .default('graded'),
  }),
});

export type CreateAssignmentInput = z.infer<
  typeof createAssignmentSchema
>['body'];
export type UpdateAssignmentInput = z.infer<
  typeof updateAssignmentSchema
>['body'];
export type SubmitAssignmentInput = z.infer<
  typeof submitAssignmentSchema
>['body'];
export type GradeSubmissionInput = z.infer<
  typeof gradeSubmissionSchema
>['body'];
