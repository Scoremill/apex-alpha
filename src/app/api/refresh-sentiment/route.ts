import { NextRequest, NextResponse } from 'next/server';
import { analyzeSentiment } from '@/lib/openai';
import { generateSignal } from '@/lib/signal-engine';
import { getQuote, getHistoricalData, calculateTechnicals } from '@/lib/yahoo-finance';
import { storeSentiment } from '@/lib/sentiment-service';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface NewsItem {
  title?: string;
}

interface SearchResult {
  news?: NewsItem[];
}

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Fetch news headlines for the symbol
    const headlines = await fetchNewsHeadlines(symbol);

    // Analyze sentiment using OpenAI
    const sentiment = await analyzeSentiment(symbol, headlines);

    // Store sentiment in Firestore for persistence and historical tracking
    try {
      await storeSentiment(symbol, sentiment, headlines);
    } catch (storeError) {
      // Log but don't fail the request if storage fails
      console.warn('Failed to store sentiment:', storeError);
    }

    // Fetch market data and technicals to generate updated signal
    const [marketData, historicalData] = await Promise.all([
      getQuote(symbol),
      getHistoricalData(symbol, '3mo'),
    ]);

    let signal = null;
    if (marketData && historicalData.length > 0) {
      const technicals = calculateTechnicals(historicalData, marketData.price);
      signal = generateSignal(technicals, sentiment);
    }

    return NextResponse.json({
      sentiment,
      signal,
      headlinesAnalyzed: headlines.length,
      storedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error refreshing sentiment:', error);
    return NextResponse.json(
      { error: 'Failed to refresh sentiment' },
      { status: 500 }
    );
  }
}

async function fetchNewsHeadlines(symbol: string): Promise<string[]> {
  try {
    // Get company name for better filtering
    let companyName = symbol;
    try {
      const quote = await yahooFinance.quote(symbol);
      if (quote && 'shortName' in quote && quote.shortName) {
        companyName = quote.shortName as string;
      }
    } catch {
      // Ignore quote fetch errors
    }

    // Use Yahoo Finance search to get news for the symbol
    const searchResult = (await yahooFinance.search(symbol)) as SearchResult;

    if (!searchResult.news || searchResult.news.length === 0) {
      return [];
    }

    // Extract headlines - filter to only include headlines that mention the symbol or company
    const symbolUpper = symbol.toUpperCase();
    const companyNameLower = companyName.toLowerCase();
    const companyFirstWord = companyNameLower.split(/[\s,]/)[0]; // e.g., "Delta" from "Delta Air Lines"

    const filteredHeadlines = searchResult.news
      .slice(0, 20) // Get more to filter from
      .map((item) => item.title || '')
      .filter((title) => {
        if (title.length === 0) return false;
        const titleLower = title.toLowerCase();
        const titleUpper = title.toUpperCase();
        // Include if the headline mentions the symbol or company name
        return (
          titleUpper.includes(symbolUpper) ||
          titleLower.includes(companyNameLower) ||
          titleLower.includes(companyFirstWord)
        );
      })
      .slice(0, 10); // Return max 10 relevant headlines

    // If no filtered headlines, return unfiltered (better than nothing for sentiment)
    if (filteredHeadlines.length === 0) {
      console.log(`No headlines found mentioning ${symbol} or ${companyName}, using all available`);
      return searchResult.news
        .slice(0, 10)
        .map((item) => item.title || '')
        .filter((title) => title.length > 0);
    }

    return filteredHeadlines;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}
