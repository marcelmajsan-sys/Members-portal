import { prisma, type Task, type TaskStatus, type TaskPriority } from '@ecommerce-hr/db';

const taskInclude = {
  assignedTo: {
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  },
  createdBy: {
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  },
};

export async function createTask(data: {
  title: string;
  description?: string;
  assignedToId?: string;
  createdById?: string;
  priority?: TaskPriority;
  dueAt?: string;
}): Promise<Task> {
  return prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      assignedToId: data.assignedToId,
      createdById: data.createdById,
      priority: data.priority,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
    },
    include: taskInclude,
  });
}

export async function getTasks(
  filters: {
    status?: TaskStatus;
    assignedToId?: string;
    priority?: TaskPriority;
  },
  page: number,
  limit: number,
): Promise<{ tasks: Task[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.priority) where.priority = filters.priority;

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      include: taskInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total };
}

export async function getTaskById(id: string): Promise<Task | null> {
  return prisma.task.findUnique({
    where: { id },
    include: {
      ...taskInclude,
      comments: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignedToId: string;
    dueAt: string;
  }>,
): Promise<Task> {
  const updateData: Record<string, unknown> = { ...data };
  if (data.dueAt) {
    updateData.dueAt = new Date(data.dueAt);
  }
  if (data.status === 'DONE') {
    updateData.completedAt = new Date();
  }

  return prisma.task.update({
    where: { id },
    data: updateData,
    include: taskInclude,
  });
}

export async function deleteTask(id: string): Promise<void> {
  await prisma.task.delete({ where: { id } });
}

export async function getTaskComments(taskId: string) {
  return prisma.taskComment.findMany({
    where: { taskId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createTaskComment(data: { taskId: string; userId: string; content: string }) {
  return prisma.taskComment.create({
    data: {
      taskId: data.taskId,
      userId: data.userId,
      content: data.content,
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });
}

export async function getTaskStats(): Promise<{
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}> {
  const [todo, inProgress, done, overdue] = await Promise.all([
    prisma.task.count({ where: { status: 'TODO' } }),
    prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.task.count({ where: { status: 'DONE' } }),
    prisma.task.count({
      where: {
        dueAt: { lt: new Date() },
        status: { not: 'DONE' },
      },
    }),
  ]);

  return { todo, inProgress, done, overdue };
}
