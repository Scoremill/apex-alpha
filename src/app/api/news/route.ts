import { NextRequest, NextResponse } from 'next/server';
import { getMultipleNews, type NewsArticle } from '@/lib/yahoo-finance';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get('symbols');
    const limitParam = searchParams.get('limit');

    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'Missing symbols parameter' },
        { status: 400 }
      );
    }

    const symbols = symbolsParam.split(',').map((s) => s.trim());
    const limit = limitParam ? parseInt(limitParam, 10) : 2;

    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'No valid symbols provided' },
        { status: 400 }
      );
    }

    const newsMap = await getMultipleNews(symbols, limit);

    // Convert Map to plain object
    const result: Record<string, NewsArticle[]> = {};
    newsMap.forEach((value, key) => {
      result[key] = value;
    });

    return NextResponse.json(result, {
      headers: {
        // Cache for 15 minutes since news doesn't change frequently
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Error in news API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news data' },
      { status: 500 }
    );
  }
}
