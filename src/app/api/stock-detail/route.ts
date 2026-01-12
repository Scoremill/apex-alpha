import { NextRequest, NextResponse } from 'next/server';
import {
  getQuote,
  getHistoricalData,
  calculateTechnicals,
} from '@/lib/yahoo-finance';
import { generateQuickSignal, generateSignal } from '@/lib/signal-engine';
import { getStoredSentiment } from '@/lib/sentiment-service';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Type definitions for Yahoo Finance responses
interface QuoteSummary {
  recommendationTrend?: {
    trend?: Array<{
      strongBuy?: number;
      buy?: number;
      hold?: number;
      sell?: number;
      strongSell?: number;
    }>;
  };
  earningsHistory?: {
    history?: Array<{
      quarter?: { fmt?: string };
      epsActual?: { raw?: number };
      epsEstimate?: { raw?: number };
      surprisePercent?: { raw?: number };
      quarterDate?: string;
    }>;
  };
  earnings?: {
    earningsChart?: {
      quarterly?: Array<{
        date?: string;
        actual?: { raw?: number; fmt?: string };
        estimate?: { raw?: number; fmt?: string };
      }>;
    };
    financialsChart?: {
      quarterly?: Array<{
        date?: string;
        revenue?: { raw?: number; fmt?: string };
        earnings?: { raw?: number; fmt?: string };
      }>;
    };
  };
  calendarEvents?: {
    earnings?: {
      earningsDate?: Date[];
    };
  };
  financialData?: {
    targetMeanPrice?: { raw?: number };
    recommendationKey?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const period = (searchParams.get('period') || '3m') as '1m' | '3m' | '6m' | '1y';

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Fetch all data in parallel (including stored sentiment)
    const [marketData, historicalData, quoteSummaryResult, storedSentiment] = await Promise.all([
      getQuote(symbol),
      getHistoricalData(symbol, period === '1m' ? '1mo' : period === '3m' ? '3mo' : period === '6m' ? '6mo' : '1y'),
      fetchQuoteSummary(symbol),
      getStoredSentiment(symbol),
    ]);

    if (!marketData) {
      return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 404 });
    }

    // Calculate technicals
    const technicals = historicalData.length > 0
      ? calculateTechnicals(historicalData, marketData.price)
      : null;

    // Generate signal - use stored sentiment if available, otherwise quick signal
    let signal = null;
    if (technicals) {
      if (storedSentiment) {
        signal = generateSignal(technicals, {
          score: storedSentiment.score,
          label: storedSentiment.label,
          rationale: storedSentiment.rationale,
        });
      } else {
        signal = generateQuickSignal(technicals);
      }
    }

    // Extract sparkline data (closing prices)
    const sparklineData = historicalData.map((d) => d.close);

    // Parse earnings data
    const earnings = parseEarningsData(quoteSummaryResult);

    // Parse analyst recommendations
    const recommendation = parseRecommendation(quoteSummaryResult);

    // Format sentiment for response
    const sentiment = storedSentiment ? {
      score: storedSentiment.score,
      label: storedSentiment.label,
      rationale: storedSentiment.rationale,
      analyzedAt: storedSentiment.analyzedAt?.toDate?.()?.toISOString() || null,
      headlinesCount: storedSentiment.headlinesCount,
    } : null;

    return NextResponse.json({
      marketData,
      sparklineData,
      technicals,
      signal,
      sentiment,
      earnings,
      recommendation,
    });
  } catch (error) {
    console.error('Error in stock detail API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function fetchQuoteSummary(symbol: string): Promise<QuoteSummary | null> {
  try {
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: ['recommendationTrend', 'earningsHistory', 'earnings', 'calendarEvents', 'financialData'],
    });
    return result as unknown as QuoteSummary;
  } catch (error) {
    console.error('Error fetching quote summary:', error);
    return null;
  }
}

function parseEarningsData(data: QuoteSummary | null): Array<{
  quarter: string;
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  surprise: number | null;
}> {
  if (!data) {
    console.log('parseEarningsData: No data provided');
    return [];
  }

  // Try earningsHistory first (more reliable for stocks)
  if (data.earningsHistory?.history && data.earningsHistory.history.length > 0) {
    console.log('parseEarningsData: Using earningsHistory module');
    return data.earningsHistory.history
      .slice(0, 4)
      .map((earning) => {
        // Handle both formats: direct value or { raw: value }
        const epsActual = typeof earning.epsActual === 'number'
          ? earning.epsActual
          : (earning.epsActual?.raw ?? null);
        const epsEstimate = typeof earning.epsEstimate === 'number'
          ? earning.epsEstimate
          : (earning.epsEstimate?.raw ?? null);
        const surprise = typeof earning.surprisePercent === 'number'
          ? earning.surprisePercent
          : (earning.surprisePercent?.raw ?? null);

        // Format quarter from date string like "2024-12-31T00:00:00.000Z"
        let quarterStr = 'N/A';
        let dateStr = 'N/A';
        const quarterValue = earning.quarter;
        if (quarterValue) {
          try {
            const date = new Date(quarterValue as string | Date);
            if (!isNaN(date.getTime())) {
              const month = date.getUTCMonth();
              const year = date.getUTCFullYear();
              // Determine calendar quarter based on month (0-indexed)
              const q = month < 3 ? 'Q1' : month < 6 ? 'Q2' : month < 9 ? 'Q3' : 'Q4';
              quarterStr = `${q} ${year}`;
              dateStr = date.toLocaleDateString();
            }
          } catch {
            // Keep N/A
          }
        }

        return {
          quarter: quarterStr,
          date: dateStr,
          epsActual,
          epsEstimate,
          revenueActual: null,
          revenueEstimate: null,
          surprise,
        };
      });
  }

  // Fallback to earnings.earningsChart
  if (data.earnings?.earningsChart?.quarterly && data.earnings.earningsChart.quarterly.length > 0) {
    console.log('parseEarningsData: Using earnings.earningsChart module');
    const financials = data.earnings.financialsChart?.quarterly || [];

    return data.earnings.earningsChart.quarterly
      .slice(0, 4)
      .map((earning, idx) => {
        const financial = financials[idx];
        // Handle both formats: direct value or { raw: value }
        const epsActual = typeof earning.actual === 'number'
          ? earning.actual
          : (earning.actual?.raw ?? null);
        const epsEstimate = typeof earning.estimate === 'number'
          ? earning.estimate
          : (earning.estimate?.raw ?? null);
        const surprise = epsActual !== null && epsEstimate !== null && epsEstimate !== 0
          ? (epsActual - epsEstimate) / Math.abs(epsEstimate)
          : null;

        // Handle revenue - direct value or { raw: value }
        const revenueActual = financial
          ? (typeof financial.revenue === 'number' ? financial.revenue : (financial.revenue?.raw ?? null))
          : null;

        return {
          quarter: earning.date || 'N/A',
          date: earning.date || 'N/A',
          epsActual,
          epsEstimate,
          revenueActual,
          revenueEstimate: null,
          surprise,
        };
      });
  }

  console.log('parseEarningsData: No earnings data found in either module');
  return [];
}

function parseRecommendation(data: QuoteSummary | null): {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  targetPrice: number | null;
} | null {
  if (!data?.recommendationTrend?.trend?.[0]) {
    return null;
  }

  const trend = data.recommendationTrend.trend[0];
  const strongBuy = trend.strongBuy || 0;
  const buy = trend.buy || 0;
  const hold = trend.hold || 0;
  const sell = trend.sell || 0;
  const strongSell = trend.strongSell || 0;

  // Calculate weighted rating
  const total = strongBuy + buy + hold + sell + strongSell;
  let rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' = 'Hold';

  if (total > 0) {
    const score =
      (strongBuy * 5 + buy * 4 + hold * 3 + sell * 2 + strongSell * 1) / total;

    if (score >= 4.5) rating = 'Strong Buy';
    else if (score >= 3.5) rating = 'Buy';
    else if (score >= 2.5) rating = 'Hold';
    else if (score >= 1.5) rating = 'Sell';
    else rating = 'Strong Sell';
  }

  // Use recommendation key if available
  const recKey = data.financialData?.recommendationKey;
  if (recKey) {
    if (recKey === 'strong_buy') rating = 'Strong Buy';
    else if (recKey === 'buy') rating = 'Buy';
    else if (recKey === 'hold') rating = 'Hold';
    else if (recKey === 'sell') rating = 'Sell';
    else if (recKey === 'strong_sell') rating = 'Strong Sell';
  }

  return {
    strongBuy,
    buy,
    hold,
    sell,
    strongSell,
    rating,
    targetPrice: data.financialData?.targetMeanPrice?.raw ?? null,
  };
}
