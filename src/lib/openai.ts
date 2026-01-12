import OpenAI from 'openai';
import type { SentimentResult, SentimentLabel } from '@/types';

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

export async function analyzeSentiment(
  symbol: string,
  headlines: string[]
): Promise<SentimentResult> {
  if (headlines.length === 0) {
    return {
      score: 0,
      label: 'Neutral',
      rationale: 'No recent news headlines available for analysis.',
    };
  }

  const openai = getOpenAIClient();

  if (!openai) {
    return {
      score: 0,
      label: 'Neutral',
      rationale: 'OpenAI API not configured.',
    };
  }

  const prompt = `You are an expert financial analyst providing actionable sentiment analysis for ${symbol} stock.

NEWS HEADLINES:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Focus ONLY on headlines directly related to ${symbol}, its products, services, earnings, or market position
2. Ignore generic market news unless it specifically impacts ${symbol}
3. Provide specific, actionable insights - not vague observations
4. Reference specific events, numbers, or developments from the headlines
5. If headlines aren't relevant to ${symbol}, state this clearly but still assess any indirect implications

Respond with this JSON format:
{
  "score": <-1.0 to 1.0>,
  "label": "<Bullish|Bearish|Neutral>",
  "rationale": "<2-3 sentences with SPECIFIC details: mention actual news items, earnings figures, product names, or market developments that drive your assessment. Be concrete, not generic.>"
}

GOOD rationale example: "Apple's Q4 earnings beat estimates by 12% with iPhone revenue up 8% YoY. The new M3 chip announcement positions them well against competitors. Strong services growth at 16% suggests recurring revenue momentum."

BAD rationale example: "The headlines suggest mixed sentiment in the tech sector without specific implications for the stock."

JSON only, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a Wall Street equity research analyst. Provide specific, data-driven sentiment analysis. Always cite specific headlines, numbers, or events. Never give vague or generic assessments. Respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: 350,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    return {
      score: Math.max(-1, Math.min(1, parsed.score)),
      label: validateLabel(parsed.label),
      rationale: parsed.rationale || 'Analysis completed.',
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {
      score: 0,
      label: 'Neutral',
      rationale: 'Unable to analyze sentiment at this time.',
    };
  }
}

function validateLabel(label: string): SentimentLabel {
  const normalized = label?.toLowerCase();
  if (normalized === 'bullish') return 'Bullish';
  if (normalized === 'bearish') return 'Bearish';
  return 'Neutral';
}

// Batch analyze multiple symbols
export async function analyzeSentimentBatch(
  symbolsWithHeadlines: Map<string, string[]>
): Promise<Map<string, SentimentResult>> {
  const results = new Map<string, SentimentResult>();

  // Process in parallel with rate limiting
  const entries = Array.from(symbolsWithHeadlines.entries());
  const batchSize = 5;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async ([symbol, headlines]) => {
        const result = await analyzeSentiment(symbol, headlines);
        return { symbol, result };
      })
    );

    for (const { symbol, result } of batchResults) {
      results.set(symbol, result);
    }

    // Rate limiting delay between batches
    if (i + batchSize < entries.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
