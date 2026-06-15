import { prisma, type Prisma } from '@ecommerce-hr/db';
import type { CreateSequenceInput, UpdateSequenceInput } from '@ecommerce-hr/shared';

export async function getSequences(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [sequences, total] = await Promise.all([
    prisma.sequence.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { logs: true } },
      },
    }),
    prisma.sequence.count(),
  ]);

  return { sequences, total };
}

export async function getSequenceById(id: string) {
  return prisma.sequence.findUnique({
    where: { id },
    include: {
      _count: { select: { logs: true } },
    },
  });
}

export async function createSequence(data: CreateSequenceInput) {
  return prisma.sequence.create({
    data: {
      name: data.name,
      description: data.description,
      triggerEvent: data.triggerEvent,
      steps: data.steps as Prisma.InputJsonValue,
      status: data.status ?? 'ACTIVE',
    },
  });
}

export async function updateSequence(id: string, data: UpdateSequenceInput) {
  const updateData: Prisma.SequenceUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.triggerEvent !== undefined) updateData.triggerEvent = data.triggerEvent;
  if (data.steps !== undefined) updateData.steps = data.steps as Prisma.InputJsonValue;
  if (data.status !== undefined) updateData.status = data.status;

  return prisma.sequence.update({
    where: { id },
    data: updateData,
  });
}

export async function updateSequenceStatus(id: string, status: string) {
  return prisma.sequence.update({
    where: { id },
    data: { status: status as 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' },
  });
}

export async function getSequenceLogs(sequenceId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.automationLog.findMany({
      where: { sequenceId },
      skip,
      take: limit,
      orderBy: { executedAt: 'desc' },
    }),
    prisma.automationLog.count({ where: { sequenceId } }),
  ]);

  return { logs, total };
}
