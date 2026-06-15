import { prisma } from '@ecommerce-hr/db';
import bcrypt from 'bcryptjs';

export async function createEmployee(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'OPERATOR',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
}

export async function getEmployees() {
  return prisma.user.findMany({
    where: { role: { in: ['OPERATOR', 'OWNER'] } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getEmployeeById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id, role: { in: ['OPERATOR', 'OWNER'] } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  const now = new Date();
  const [todo, inProgress, done, overdue] = await Promise.all([
    prisma.task.count({ where: { assignedToId: id, status: 'TODO' } }),
    prisma.task.count({ where: { assignedToId: id, status: 'IN_PROGRESS' } }),
    prisma.task.count({ where: { assignedToId: id, status: 'DONE' } }),
    prisma.task.count({
      where: {
        assignedToId: id,
        dueAt: { lt: now },
        status: { not: 'DONE' },
      },
    }),
  ]);

  return {
    ...user,
    taskStats: { todo, inProgress, done, overdue },
  };
}

export async function updateEmployee(
  id: string,
  data: Partial<{ firstName: string; lastName: string; email: string; role: 'OPERATOR' | 'OWNER'; isActive: boolean }>,
) {
  return prisma.user.update({
    where: { id, role: { in: ['OPERATOR', 'OWNER'] } },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function changeEmployeePassword(id: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id, role: { in: ['OPERATOR', 'OWNER'] } },
    data: { passwordHash },
    select: { id: true },
  });
}

export async function deactivateEmployee(id: string) {
  return prisma.user.update({
    where: { id, role: { in: ['OPERATOR', 'OWNER'] } },
    data: { isActive: false },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}
