import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface SearchQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
}

interface SearchResult {
  quotes?: SearchQuote[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      );
    }

    // Search Yahoo Finance for cryptocurrencies
    const results = await yahooFinance.search(query) as SearchResult;

    // Filter for cryptocurrencies only (symbols ending in -USD typically)
    const cryptoResults = (results.quotes || [])
      .filter((q) =>
        q.quoteType === 'CRYPTOCURRENCY' ||
        (q.symbol && q.symbol.endsWith('-USD') && !q.quoteType?.includes('EQUITY'))
      )
      .slice(0, 10)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
      }));

    return NextResponse.json(cryptoResults, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error searching cryptocurrencies:', error);
    return NextResponse.json(
      { error: 'Failed to search cryptocurrencies' },
      { status: 500 }
    );
  }
}
