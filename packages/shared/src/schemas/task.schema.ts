import { z } from 'zod';

export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export const taskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToId: z.string().cuid().optional(),
  priority: taskPriorityEnum.optional(),
  dueAt: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: taskStatusEnum.optional(),
});

export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
});

export const taskFilterSchema = z.object({
  status: taskStatusEnum.optional(),
  assignedToId: z.string().cuid().optional(),
  priority: taskPriorityEnum.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
