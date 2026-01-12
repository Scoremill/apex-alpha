import { NextRequest, NextResponse } from 'next/server';
import { getMultipleQuotes } from '@/lib/yahoo-finance';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get('symbols');

    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'Missing symbols parameter' },
        { status: 400 }
      );
    }

    const symbols = symbolsParam.split(',').map((s) => s.trim());

    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'No valid symbols provided' },
        { status: 400 }
      );
    }

    const quotes = await getMultipleQuotes(symbols);

    // Convert Map to plain object
    const result: Record<string, unknown> = {};
    quotes.forEach((value, key) => {
      result[key] = value;
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error in market-data API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
