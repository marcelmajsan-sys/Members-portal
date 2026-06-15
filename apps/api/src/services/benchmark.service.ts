import { prisma } from '@ecommerce-hr/db';

export async function createBenchmark(data: {
  category: string;
  metric: string;
  value: number;
  period: string;
  region?: string;
}) {
  return prisma.benchmarkData.create({
    data: {
      category: data.category,
      metric: data.metric,
      value: data.value,
      period: data.period,
      region: data.region ?? 'HR',
    },
  });
}

export async function getBenchmarks(
  filters: { category?: string; period?: string; region?: string },
  page: number,
  limit: number,
) {
  const where: Record<string, unknown> = {};
  if (filters.category) where.category = filters.category;
  if (filters.period) where.period = filters.period;
  if (filters.region) where.region = filters.region;

  const skip = (page - 1) * limit;

  const [benchmarks, total] = await Promise.all([
    prisma.benchmarkData.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.benchmarkData.count({ where }),
  ]);

  return { benchmarks, total };
}

export async function getBenchmarkById(id: string) {
  return prisma.benchmarkData.findUnique({ where: { id } });
}

export async function updateBenchmark(
  id: string,
  data: Partial<{
    category: string;
    metric: string;
    value: number;
    period: string;
    region: string;
  }>,
) {
  return prisma.benchmarkData.update({ where: { id }, data });
}

export async function deleteBenchmark(id: string) {
  await prisma.benchmarkData.delete({ where: { id } });
}

export async function getBenchmarkCategories() {
  const results = await prisma.benchmarkData.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return results.map((r) => r.category);
}
