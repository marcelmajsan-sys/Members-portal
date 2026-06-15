import { askJson } from './claude.js';

export interface CompetitorMetrics {
  techStack: string[];
  paymentMethods: string[];
  strengths: string[];
  weaknesses: string[];
  score: number;
  summary: string;
}

const SYSTEM_PROMPT = `You are an expert e-commerce competitor analyst for the Croatian market.
You analyze competitor web shops and return structured metrics.

For each competitor, identify:
- Tech stack (platform, CMS, frameworks, analytics tools)
- Payment methods (credit cards, PayPal, cash on delivery, bank transfer, etc.)
- Strengths (what they do well)
- Weaknesses (areas for improvement)
- Overall competitive score from 0 to 100

Focus on aspects relevant to Croatian/EU e-commerce:
- GDPR compliance
- Croatian language support
- Local payment options (Corvus, WSPay, etc.)
- Delivery options for Croatia/region
- Mobile experience
- SEO and content quality

Respond with JSON matching this structure:
{
  "techStack": ["string"],
  "paymentMethods": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "score": number,
  "summary": "string"
}`;

export async function runCompetitorScan(
  name: string,
  websiteUrl: string,
  industry?: string,
): Promise<CompetitorMetrics> {
  const industryContext = industry ? `\nIndustry: ${industry}` : '';

  return askJson<CompetitorMetrics>(
    SYSTEM_PROMPT,
    `Analyze the following competitor web shop:
Name: ${name}
URL: ${websiteUrl}${industryContext}

Provide a comprehensive competitive analysis based on common patterns for this type of e-commerce site and domain.`,
    { maxTokens: 4096 },
  );
}
