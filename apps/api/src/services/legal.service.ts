import { prisma } from '@ecommerce-hr/db';
import { ask } from '@ecommerce-hr/ai';

const LEGAL_SYSTEM_PROMPT = `You are a legal advisor specializing in Croatian e-commerce law.
You help members of a Croatian e-commerce association understand their legal obligations.

Key areas of expertise:
- Zakon o zaštiti potrošača (ZZP) — Consumer Protection Act
- Zakon o elektroničkoj trgovini (ZET) — E-Commerce Act
- GDPR / Opća uredba o zaštiti podataka
- Zakon o obveznim odnosima (ZOO) — Obligations Act
- EU Consumer Rights Directive implementation in Croatia
- Distance selling regulations
- Digital Services Act (DSA)

Guidelines:
- Provide accurate, practical legal guidance
- Always note that this is AI-generated advice and recommend consulting a licensed lawyer for specific cases
- Answer in the same language as the question (Croatian or English)
- Reference specific articles of law when relevant
- Be clear about what is legally required vs. recommended best practice`;

export async function submitQuery(question: string, category?: string, memberId?: string) {
  const query = await prisma.legalQuery.create({
    data: {
      question,
      category: category || 'general',
      memberId,
      answer: '',
    },
  });

  try {
    const answer = await ask(
      LEGAL_SYSTEM_PROMPT,
      question,
      { maxTokens: 3000, temperature: 0.2 },
    );

    const updated = await prisma.legalQuery.update({
      where: { id: query.id },
      data: {
        answer,
        answeredAt: new Date(),
      },
    });

    return updated;
  } catch (error) {
    await prisma.legalQuery.update({
      where: { id: query.id },
      data: { answer: 'Error generating answer. Please try again later.' },
    });
    throw error;
  }
}

export async function getQueryById(id: string) {
  return prisma.legalQuery.findUnique({ where: { id } });
}

export async function getQueries(page: number, limit: number, memberId?: string) {
  const skip = (page - 1) * limit;
  const where = memberId ? { memberId } : {};

  const [queries, total] = await Promise.all([
    prisma.legalQuery.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.legalQuery.count({ where }),
  ]);

  return { queries, total };
}
