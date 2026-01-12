import YahooFinance from 'yahoo-finance2';
import type { MarketData, Technicals } from '@/types';

// Instantiate Yahoo Finance (required in v3)
const yahooFinance = new YahooFinance();

// Type for Yahoo Finance quote response
interface YahooQuote {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketChange?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  averageDailyVolume3Month?: number;
  averageDailyVolume10Day?: number;
}

export async function getQuote(symbol: string): Promise<MarketData | null> {
  try {
    const quote = await yahooFinance.quote(symbol) as YahooQuote;

    if (!quote) return null;

    return {
      price: quote.regularMarketPrice ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      change: quote.regularMarketChange ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      high: quote.regularMarketDayHigh ?? 0,
      low: quote.regularMarketDayLow ?? 0,
      open: quote.regularMarketOpen ?? 0,
      previousClose: quote.regularMarketPreviousClose ?? 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
      avgVolume: quote.averageDailyVolume3Month ?? quote.averageDailyVolume10Day ?? 0,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

export async function getMultipleQuotes(symbols: string[]): Promise<Map<string, MarketData>> {
  const results = new Map<string, MarketData>();

  try {
    const quotes = await yahooFinance.quote(symbols) as YahooQuote | YahooQuote[];
    const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

    for (const quote of quotesArray) {
      if (quote && quote.symbol) {
        results.set(quote.symbol, {
          price: quote.regularMarketPrice ?? 0,
          changePercent: quote.regularMarketChangePercent ?? 0,
          change: quote.regularMarketChange ?? 0,
          volume: quote.regularMarketVolume ?? 0,
          high: quote.regularMarketDayHigh ?? 0,
          low: quote.regularMarketDayLow ?? 0,
          open: quote.regularMarketOpen ?? 0,
          previousClose: quote.regularMarketPreviousClose ?? 0,
        });
      }
    }
  } catch (error) {
    console.error('Error fetching multiple quotes:', error);
  }

  return results;
}

interface ChartQuote {
  date: Date;
  close: number | null;
  volume?: number;
}

interface ChartResult {
  quotes?: ChartQuote[];
}

export async function getHistoricalData(
  symbol: string,
  period: '1mo' | '3mo' | '6mo' | '1y' = '3mo'
): Promise<{ date: Date; close: number; volume: number }[]> {
  try {
    const result = await yahooFinance.chart(symbol, {
      period1: getStartDate(period),
      interval: '1d',
    }) as ChartResult;

    if (!result?.quotes) return [];

    return result.quotes
      .filter((q): q is ChartQuote & { close: number } => q.close !== null)
      .map((q) => ({
        date: new Date(q.date),
        close: q.close,
        volume: q.volume ?? 0,
      }));
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return [];
  }
}

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '1mo':
      return new Date(now.setMonth(now.getMonth() - 1));
    case '3mo':
      return new Date(now.setMonth(now.getMonth() - 3));
    case '6mo':
      return new Date(now.setMonth(now.getMonth() - 6));
    case '1y':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    default:
      return new Date(now.setMonth(now.getMonth() - 3));
  }
}

// Calculate technical indicators from historical data
export function calculateTechnicals(
  data: { close: number }[],
  currentPrice: number
): Technicals {
  const closes = data.map((d) => d.close);

  return {
    rsi: calculateRSI(closes, 14),
    macd: calculateMACD(closes).macd,
    macdSignal: calculateMACD(closes).signal,
    macdHist: calculateMACD(closes).histogram,
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    sma200: calculateSMA(closes, 200),
    price: currentPrice,
  };
}

// RSI calculation
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// MACD calculation
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;

  // For signal line, we'd need MACD history - simplified here
  const signal = macd * 0.9; // Approximation
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

// EMA calculation
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

// SMA calculation
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Period configuration for sparkline data
export type SparklinePeriod = '1d' | '1wk' | '1mo' | '6mo' | '1y' | '3y' | '5y' | '10y' | 'max';

function getSparklineConfig(period: SparklinePeriod): { days: number; interval: '1h' | '1d' | '1wk' | '1mo' } {
  switch (period) {
    case '1d':
      // Use 5 days with daily interval to ensure we get data even on weekends/after hours
      return { days: 5, interval: '1d' };
    case '1wk':
      return { days: 10, interval: '1d' };
    case '1mo':
      return { days: 30, interval: '1d' };
    case '6mo':
      return { days: 180, interval: '1d' };
    case '1y':
      return { days: 365, interval: '1d' };
    case '3y':
      return { days: 365 * 3, interval: '1wk' };
    case '5y':
      return { days: 365 * 5, interval: '1wk' };
    case '10y':
      return { days: 365 * 10, interval: '1mo' };
    case 'max':
      return { days: 365 * 50, interval: '1mo' }; // ~50 years for "all time"
    default:
      return { days: 30, interval: '1d' };
  }
}

// Get sparkline data with configurable period
export async function getSparklineData(symbol: string, period: SparklinePeriod = '1mo'): Promise<number[]> {
  try {
    const config = getSparklineConfig(period);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - config.days);

    const result = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: endDate,
      interval: config.interval,
    }) as ChartResult;

    if (!result?.quotes) return [];

    return result.quotes
      .filter((q): q is ChartQuote & { close: number } => q.close !== null)
      .map((q) => q.close);
  } catch (error) {
    console.error(`Error fetching sparkline data for ${symbol}:`, error);
    return [];
  }
}

// Get sparkline data for multiple symbols
export async function getMultipleSparklines(
  symbols: string[],
  period: SparklinePeriod = '1mo'
): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>();

  // Fetch in parallel but with some batching to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      const data = await getSparklineData(symbol, period);
      return { symbol, data };
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ symbol, data }) => {
      results.set(symbol, data);
    });
  }

  return results;
}

// Search result type
interface SearchQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
}

interface SearchResult {
  quotes?: SearchQuote[];
}

// Search for tickers (includes stocks and ETFs)
export async function searchTickers(query: string): Promise<{ symbol: string; name: string; type: string }[]> {
  try {
    const results = await yahooFinance.search(query) as SearchResult;

    return (results.quotes || [])
      .filter((q) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .slice(0, 10)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType || 'EQUITY',
      }));
  } catch (error) {
    console.error('Error searching tickers:', error);
    return [];
  }
}

// News article interface
export interface NewsArticle {
  title: string;
  link: string;
  publisher: string;
  publishedAt: Date;
  thumbnail?: string;
}

// Yahoo Finance news result type
interface YahooNewsArticle {
  title: string;
  link: string;
  publisher?: string;
  providerPublishTime?: Date;
  thumbnail?: { resolutions?: Array<{ url: string }> };
}

interface YahooSearchWithNews {
  quotes?: SearchQuote[];
  news?: YahooNewsArticle[];
}

// Get news for a symbol
export async function getNews(symbol: string, limit: number = 3): Promise<NewsArticle[]> {
  try {
    // Yahoo Finance search returns news in the results
    const results = await yahooFinance.search(symbol, { newsCount: limit }) as YahooSearchWithNews;

    if (!results.news) return [];

    return results.news.slice(0, limit).map((article) => ({
      title: article.title,
      link: article.link,
      publisher: article.publisher || 'Unknown',
      publishedAt: article.providerPublishTime ? new Date(article.providerPublishTime) : new Date(),
      thumbnail: article.thumbnail?.resolutions?.[0]?.url,
    }));
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}

// Get news for multiple symbols
export async function getMultipleNews(symbols: string[], limit: number = 2): Promise<Map<string, NewsArticle[]>> {
  const results = new Map<string, NewsArticle[]>();

  // Fetch in parallel with batching
  const batchSize = 3;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      const news = await getNews(symbol, limit);
      return { symbol, news };
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ symbol, news }) => {
      results.set(symbol, news);
    });
  }

  return results;
}
