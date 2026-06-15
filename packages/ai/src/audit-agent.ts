import { askJson } from './claude.js';

export interface AuditScores {
  performance: number;
  seo: number;
  security: number;
  ux: number;
  accessibility: number;
  overall: number;
}

export interface AuditRecommendation {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface AuditResult {
  scores: AuditScores;
  recommendations: AuditRecommendation[];
  summary: string;
}

const SYSTEM_PROMPT = `You are an expert e-commerce web shop auditor for the Croatian market.
You analyze web shops across 5 categories: performance, SEO, security, UX, and accessibility.

For each category, provide a score from 0 to 100.
Also provide an overall score (weighted average: performance 20%, SEO 20%, security 25%, UX 20%, accessibility 15%).

Provide actionable recommendations sorted by severity (critical first).
Focus on issues relevant to Croatian/EU e-commerce regulations and best practices.

Respond with JSON matching this structure:
{
  "scores": { "performance": number, "seo": number, "security": number, "ux": number, "accessibility": number, "overall": number },
  "recommendations": [{ "category": string, "severity": "critical"|"warning"|"info", "title": string, "description": string }],
  "summary": string
}`;

export async function runAuditAgent(websiteUrl: string): Promise<AuditResult> {
  return askJson<AuditResult>(
    SYSTEM_PROMPT,
    `Analyze the following e-commerce web shop URL and provide a comprehensive audit report: ${websiteUrl}

Consider common issues for Croatian web shops including:
- GDPR compliance indicators
- Croatian language support
- Payment gateway integration patterns
- Mobile responsiveness
- SSL/TLS configuration
- Cookie consent handling
- Legal pages (Uvjeti korištenja, Politika privatnosti)

Provide your analysis based on common patterns for this type of URL and domain.`,
    { maxTokens: 4096 },
  );
}
