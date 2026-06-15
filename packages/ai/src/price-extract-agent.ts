import { ask } from './claude.js';

export interface ProductPrice {
  name: string;
  price: number;
  currency: string;
  url: string;
}

export interface PriceDiff {
  added: ProductPrice[];
  removed: ProductPrice[];
  priceChanges: Array<{
    name: string;
    oldPrice: number;
    newPrice: number;
    currency: string;
    url: string;
    changePercent: number;
  }>;
}

const SYSTEM_PROMPT = `You are an expert price extraction agent for Croatian/EU e-commerce.
You are given the actual HTML content of a product category page. Extract all product prices from it.

For each product found in the HTML, extract:
- name: product name/title (from the HTML)
- price: numeric price (the final/discounted price if on sale)
- currency: currency code (EUR, HRK, etc.)
- url: full product URL (resolve relative URLs using the base URL provided)

Important:
- ONLY extract products that are actually present in the HTML. Do NOT invent or guess products.
- If you cannot find products in the HTML, return an empty array.
- Use the final/sale price if discounted
- If prices are in kuna (HRK/kn), convert to EUR using rate 7.5345
- Maximum 50 products per scan
- If the HTML seems to be a bot-block page, error page, or empty, return empty array

Respond with JSON matching this structure:
{
  "products": [
    { "name": "string", "price": number, "currency": "EUR", "url": "string" }
  ]
}`;

export function cleanHtml(html: string): string {
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sclass="[^"]*"/gi, '')
    .replace(/\sdata-[a-z-]+="[^"]*"/gi, '')
    .replace(/\sid="[^"]*"/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<input[^>]*>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<select[\s\S]*?<\/select>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/\s{2,}/g, ' ');

  // Try to find product area: skip content before first price indicator
  const priceIdx = cleaned.search(/\d+[,\.]\d{2}\s*(?:€|EUR|kn|HRK)/i);
  if (priceIdx > 1000) {
    // Start 1000 chars before first price to capture product name
    const start = Math.max(0, priceIdx - 1000);
    console.log(`[price-extract] Skipping to product area at offset ${start}`);
    return cleaned.slice(start, start + 150000);
  }

  return cleaned.slice(0, 150000);
}

function extractJson(text: string): { products: ProductPrice[] } {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // noop
  }

  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*"products"\s*:\s*\[[\s\S]*\]\s*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // noop
    }
  }

  // Try to extract from markdown code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // noop
    }
  }

  return { products: [] };
}

export async function extractPricesFromHtml(
  html: string,
  categoryUrl: string,
  competitorName: string,
): Promise<ProductPrice[]> {
  const cleaned = cleanHtml(html);

  console.log(`[price-extract] Raw HTML: ${html.length} bytes, Cleaned: ${cleaned.length} bytes`);

  if (!cleaned || cleaned.length < 100) {
    console.log('[price-extract] Cleaned HTML too short, returning empty');
    return [];
  }

  const text = await ask(
    SYSTEM_PROMPT + '\n\nYou MUST respond with ONLY valid JSON. No explanation, no text before or after. Just the JSON object.',
    `Extract product prices from the following HTML of a category page.

Competitor: ${competitorName}
Base URL: ${categoryUrl}

--- HTML START ---
${cleaned}
--- HTML END ---

Respond with ONLY a JSON object. No other text.`,
    { maxTokens: 8192 },
  );

  console.log(`[price-extract] Claude response (first 500 chars): ${text.slice(0, 500)}`);

  const result = extractJson(text);
  console.log(`[price-extract] Extracted ${result.products.length} products`);
  return result.products || [];
}

export function computePriceDiff(
  current: ProductPrice[],
  previous: ProductPrice[],
): PriceDiff {
  const prevMap = new Map(previous.map((p) => [p.name.toLowerCase(), p]));
  const currMap = new Map(current.map((p) => [p.name.toLowerCase(), p]));

  const added: ProductPrice[] = [];
  const removed: ProductPrice[] = [];
  const priceChanges: PriceDiff['priceChanges'] = [];

  for (const product of current) {
    const key = product.name.toLowerCase();
    const prev = prevMap.get(key);
    if (!prev) {
      added.push(product);
    } else if (Math.abs(prev.price - product.price) > 0.01) {
      priceChanges.push({
        name: product.name,
        oldPrice: prev.price,
        newPrice: product.price,
        currency: product.currency,
        url: product.url,
        changePercent: ((product.price - prev.price) / prev.price) * 100,
      });
    }
  }

  for (const product of previous) {
    const key = product.name.toLowerCase();
    if (!currMap.has(key)) {
      removed.push(product);
    }
  }

  return { added, removed, priceChanges };
}
