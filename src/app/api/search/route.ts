import { NextRequest, NextResponse } from 'next/server';
import { searchTickers } from '@/lib/yahoo-finance';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    const results = await searchTickers(query);

    // Map results to include type (ETF support now included)
    const mappedResults = results.map(r => ({
      symbol: r.symbol,
      name: r.name,
      type: r.type === 'ETF' ? 'etf' : r.symbol.startsWith('^') ? 'index' : 'stock',
    }));

    return NextResponse.json(mappedResults, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json([], { status: 200 }); // Return empty on error
  }
}
