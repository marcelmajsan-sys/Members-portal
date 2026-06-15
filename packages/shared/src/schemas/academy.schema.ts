import { z } from 'zod';

export const enrollModuleSchema = z.object({
  moduleId: z.string().cuid(),
});

export const updateProgressSchema = z.object({
  progress: z.number().int().min(0).max(100),
});

export const submitExamSchema = z.object({
  examId: z.string().cuid(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const mentorQuestionSchema = z.object({
  question: z.string().min(1).max(2000),
  moduleId: z.string().cuid().optional(),
});

export type EnrollModuleInput = z.infer<typeof enrollModuleSchema>;
export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
export type SubmitExamInput = z.infer<typeof submitExamSchema>;
export type MentorQuestionInput = z.infer<typeof mentorQuestionSchema>;
