import { prisma } from '@ecommerce-hr/db';
import { emitEvent } from '../lib/event-bus.js';
import { DomainEvents } from '@ecommerce-hr/shared';

export async function createMarketIntelligence(data: {
  title: string;
  category: string;
  content: Record<string, unknown>;
  source?: string;
  publishedAt?: string;
}) {
  const intel = await prisma.marketIntelligence.create({
    data: {
      title: data.title,
      category: data.category,
      content: JSON.parse(JSON.stringify(data.content)),
      source: data.source,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
    },
  });

  await emitEvent(DomainEvents.MARKET_INTEL_PUBLISHED, {
    intelId: intel.id,
    title: intel.title,
    category: intel.category,
  });

  return intel;
}

export async function getMarketIntelligence(
  filters: { category?: string },
  page: number,
  limit: number,
) {
  const where: Record<string, unknown> = {};
  if (filters.category) where.category = filters.category;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.marketIntelligence.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.marketIntelligence.count({ where }),
  ]);

  return { items, total };
}

export async function getMarketIntelligenceById(id: string) {
  return prisma.marketIntelligence.findUnique({ where: { id } });
}

export async function updateMarketIntelligence(
  id: string,
  data: Partial<{
    title: string;
    category: string;
    content: Record<string, unknown>;
    source: string;
    publishedAt: string;
  }>,
) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.content) {
    updateData.content = JSON.parse(JSON.stringify(data.content));
  }
  if (data.publishedAt) {
    updateData.publishedAt = new Date(data.publishedAt);
  }

  return prisma.marketIntelligence.update({ where: { id }, data: updateData });
}

export async function deleteMarketIntelligence(id: string) {
  await prisma.marketIntelligence.delete({ where: { id } });
}
