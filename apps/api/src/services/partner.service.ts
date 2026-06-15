import { prisma } from '@ecommerce-hr/db';

export async function getActivePartners(page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [partners, total] = await Promise.all([
    prisma.partner.findMany({
      where: { isActive: true },
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.partner.count({ where: { isActive: true } }),
  ]);

  return { partners, total };
}

export async function getPartnerById(id: string) {
  return prisma.partner.findUnique({
    where: { id },
    include: {
      obligations: {
        orderBy: { dueAt: 'asc' },
      },
    },
  });
}
