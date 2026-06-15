import { prisma } from '@ecommerce-hr/db';
import type { ProductPrice } from '@ecommerce-hr/ai';

export async function createMemberProduct(
  memberId: string,
  data: { name: string; price: number; currency?: string; category?: string; productUrl?: string },
) {
  return prisma.memberProduct.create({
    data: {
      memberId,
      name: data.name,
      price: data.price,
      currency: data.currency || 'EUR',
      category: data.category,
      productUrl: data.productUrl,
    },
  });
}

export async function getMemberProducts(memberId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.memberProduct.findMany({
      where: { memberId, isActive: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.memberProduct.count({ where: { memberId, isActive: true } }),
  ]);
  return { products: items, total };
}

export async function updateMemberProduct(
  id: string,
  memberId: string,
  data: { name?: string; price?: number; currency?: string; category?: string; productUrl?: string },
) {
  return prisma.memberProduct.update({
    where: { id, memberId },
    data,
  });
}

export async function deleteMemberProduct(id: string, memberId: string) {
  return prisma.memberProduct.update({
    where: { id, memberId },
    data: { isActive: false },
  });
}

// Normalize product name for fuzzy matching
function normalize(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

// Jaccard similarity between two token sets
function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Check if one name is a substring of the other
function isSubstringMatch(a: string, b: string): boolean {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  return la.includes(lb) || lb.includes(la);
}

export async function getProductComparison(memberId: string) {
  const memberProducts = await prisma.memberProduct.findMany({
    where: { memberId, isActive: true },
  });

  if (memberProducts.length === 0) return [];

  // Get latest price snapshots for all active competitors
  const competitors = await prisma.competitor.findMany({
    where: { isActive: true, categoryUrls: { isEmpty: false } },
    select: { id: true, name: true, categoryUrls: true },
  });

  // For each competitor, get latest snapshot per category
  const competitorPrices: Array<{ competitorId: string; competitorName: string; products: ProductPrice[] }> = [];

  for (const comp of competitors) {
    const snapshots = await prisma.priceSnapshot.findMany({
      where: { competitorId: comp.id },
      orderBy: { scannedAt: 'desc' },
      distinct: ['categoryUrl'],
    });

    const allProducts: ProductPrice[] = [];
    for (const snap of snapshots) {
      const products = snap.products as unknown as ProductPrice[];
      allProducts.push(...products);
    }

    if (allProducts.length > 0) {
      competitorPrices.push({
        competitorId: comp.id,
        competitorName: comp.name,
        products: allProducts,
      });
    }
  }

  // Match member products to competitor products
  return memberProducts.map((mp) => {
    const mpTokens = normalize(mp.name);
    const matches: Array<{
      competitorId: string;
      competitorName: string;
      productName: string;
      price: number;
      currency: string;
      diff: number;
      diffPercent: number;
    }> = [];

    for (const cp of competitorPrices) {
      for (const product of cp.products) {
        const cpTokens = normalize(product.name);
        const similarity = jaccard(mpTokens, cpTokens);

        if (similarity > 0.5 || isSubstringMatch(mp.name, product.name)) {
          const memberPrice = Number(mp.price);
          const competitorPrice = product.price;
          const diff = competitorPrice - memberPrice;
          const diffPercent = memberPrice > 0 ? (diff / memberPrice) * 100 : 0;

          matches.push({
            competitorId: cp.competitorId,
            competitorName: cp.competitorName,
            productName: product.name,
            price: competitorPrice,
            currency: product.currency || 'EUR',
            diff: Math.round(diff * 100) / 100,
            diffPercent: Math.round(diffPercent * 10) / 10,
          });
        }
      }
    }

    return {
      memberProduct: {
        id: mp.id,
        name: mp.name,
        price: Number(mp.price),
        currency: mp.currency,
        category: mp.category,
      },
      matches,
    };
  });
}
