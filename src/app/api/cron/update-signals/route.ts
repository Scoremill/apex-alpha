import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { getQuote, getHistoricalData, calculateTechnicals } from '@/lib/yahoo-finance';
import { analyzeSentiment } from '@/lib/openai';
import { generateSignal } from '@/lib/signal-engine';
import { DEFAULT_STOCKS } from '@/lib/chart-img';
import type { TickerDoc, SentimentLabel } from '@/types';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Symbols to track
const TRACKED_SYMBOLS = DEFAULT_STOCKS.map((s) => s.symbol);

interface NewsItem {
  title?: string;
}

interface SearchResult {
  news?: NewsItem[];
}

// Fetch real news headlines from Yahoo Finance, filtered for the specific symbol
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
    const companyFirstWord = companyNameLower.split(/[\s,]/)[0]; // e.g., "Apple" from "Apple Inc."

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
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const searchParams = request.nextUrl.searchParams;
    const secret = searchParams.get('secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Firebase is configured
    if (!db) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 500 }
      );
    }

    const results: { symbol: string; status: string; error?: string }[] = [];

    for (const symbol of TRACKED_SYMBOLS) {
      try {
        // 1. Fetch current market data
        const quote = await getQuote(symbol);

        if (!quote) {
          results.push({ symbol, status: 'skipped', error: 'No quote data' });
          continue;
        }

        // 2. Fetch historical data for technicals
        const historicalData = await getHistoricalData(symbol, '3mo');

        if (historicalData.length < 50) {
          results.push({ symbol, status: 'skipped', error: 'Insufficient historical data' });
          continue;
        }

        // 3. Calculate technical indicators
        const technicals = calculateTechnicals(historicalData, quote.price);

        // 4. Fetch news headlines
        const headlines = await fetchNewsHeadlines(symbol);

        // 5. Analyze sentiment with OpenAI
        const sentiment = await analyzeSentiment(symbol, headlines);

        // 6. Generate signal
        const signal = generateSignal(technicals, sentiment);

        // 7. Prepare document
        const tickerData: Omit<TickerDoc, 'name'> & { name: string } = {
          symbol,
          name: DEFAULT_STOCKS.find((s) => s.symbol === symbol)?.name || symbol,
          lastUpdated: Timestamp.now(),
          marketData: {
            price: quote.price,
            changePercent: quote.changePercent,
            change: quote.change,
            volume: quote.volume,
            rsi14: technicals.rsi,
            macdHist: technicals.macdHist,
          },
          sentiment: {
            score: sentiment.score,
            label: sentiment.label as SentimentLabel,
            rationale: sentiment.rationale,
          },
          signal: {
            action: signal.action,
            confidence: signal.confidence,
            rationale: signal.rationale,
          },
        };

        // 8. Save to Firestore
        await setDoc(doc(db, 'tickers', symbol), tickerData);

        results.push({ symbol, status: 'success' });

        // Rate limiting - wait 500ms between symbols
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        results.push({
          symbol,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: results.length,
        success: results.filter((r) => r.status === 'success').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
        errors: results.filter((r) => r.status === 'error').length,
      },
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for webhook-style triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
