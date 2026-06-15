import { askJson } from './claude.js';

export type InboxCategory = 'support' | 'complaint' | 'application' | 'partnership' | 'spam' | 'other';

export interface ClassificationResult {
  category: InboxCategory;
  confidence: number;
  summary: string;
  suggestedAction: string;
}

const SYSTEM_PROMPT = `You are an email classifier for a Croatian e-commerce association.
Classify incoming messages into one of these categories:
- support: member support requests, technical help, account issues
- complaint: formal complaints, disputes, dissatisfaction
- application: membership applications, certification requests, partnership inquiries
- partnership: business proposals, collaboration offers, sponsorship
- spam: unsolicited ads, phishing, irrelevant content
- other: anything that doesn't fit above categories

Provide a confidence score (0-1) and a brief suggested action.

Respond with JSON:
{
  "category": string,
  "confidence": number,
  "summary": string,
  "suggestedAction": string
}`;

export async function classifyMessage(
  subject: string,
  body: string,
  senderEmail?: string,
): Promise<ClassificationResult> {
  const message = [
    senderEmail ? `From: ${senderEmail}` : '',
    `Subject: ${subject}`,
    '',
    body,
  ].filter(Boolean).join('\n');

  return askJson<ClassificationResult>(
    SYSTEM_PROMPT,
    `Classify this incoming message:\n\n${message}`,
    { maxTokens: 1024 },
  );
}
