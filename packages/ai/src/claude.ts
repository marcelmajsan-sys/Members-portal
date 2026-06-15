import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export async function ask(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    // Opus 4.8 — najnoviji model. Napomena: temperature/top_p/top_k se NE smiju
    // slati (Opus 4.8 ih odbija s greškom 400); ponašanje se vodi promptom.
    model: 'claude-opus-4-8',
    max_tokens: options?.maxTokens ?? 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content[0];
  if (block.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }
  return block.text;
}

export async function askJson<T>(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<T> {
  const text = await ask(
    systemPrompt + '\n\nAlways respond with valid JSON only. No markdown, no code fences.',
    userMessage,
    options,
  );

  const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as T;
}
