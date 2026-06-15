import { ask } from './claude.js';

export interface MentorResponse {
  answer: string;
}

const SYSTEM_PROMPT = `You are an AI mentor for the Croatian E-commerce Academy.
You help members learn about e-commerce best practices, Croatian regulations, and digital commerce.

Guidelines:
- Answer in the same language the user writes in (Croatian or English)
- Be encouraging and educational
- When explaining concepts, use examples relevant to Croatian e-commerce
- If asked about exams, provide hints but don't give direct answers
- Reference relevant Croatian/EU regulations when appropriate (ZZP, GDPR, ZEP)
- Keep answers concise but thorough`;

export async function askMentor(
  question: string,
  moduleContext?: { title: string; description: string; content?: unknown },
): Promise<MentorResponse> {
  let context = '';
  if (moduleContext) {
    context = `\n\nCurrent module: "${moduleContext.title}"\nDescription: ${moduleContext.description}`;
    if (moduleContext.content) {
      context += `\nModule content: ${JSON.stringify(moduleContext.content)}`;
    }
  }

  const answer = await ask(
    SYSTEM_PROMPT + context,
    question,
    { maxTokens: 2048, temperature: 0.5 },
  );

  return { answer };
}
