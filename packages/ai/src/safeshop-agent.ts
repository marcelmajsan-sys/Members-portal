import { askJson } from './claude.js';

export interface SafeShopReviewResult {
  score: number;
  decision: 'approve' | 'reject';
  reasoning: string;
  checklist: {
    item: string;
    passed: boolean;
    note: string;
  }[];
}

const SYSTEM_PROMPT = `You are a SafeShop certification reviewer for Croatian e-commerce.
You evaluate applications for the SafeShop trust seal based on compliance criteria.

Review the application data and evaluate against these criteria:
1. Legal compliance (registered business, OIB, proper legal pages)
2. Consumer protection (return policy, warranty info, complaint process)
3. Payment security (secure payment methods, SSL)
4. Data protection (GDPR compliance, privacy policy)
5. Transparency (clear pricing, shipping info, contact details)
6. Website quality (functional, accessible, mobile-friendly)

Provide a score from 0-100 and a decision (approve if score >= 70, reject otherwise).
Include a detailed checklist of evaluated items.

Respond with JSON:
{
  "score": number,
  "decision": "approve"|"reject",
  "reasoning": string,
  "checklist": [{ "item": string, "passed": boolean, "note": string }]
}`;

export async function reviewCertification(applicationData: Record<string, unknown>): Promise<SafeShopReviewResult> {
  return askJson<SafeShopReviewResult>(
    SYSTEM_PROMPT,
    `Review this SafeShop certification application:\n\n${JSON.stringify(applicationData, null, 2)}`,
    { maxTokens: 4096 },
  );
}
