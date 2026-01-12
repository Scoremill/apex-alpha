import { NextRequest, NextResponse } from 'next/server';
import { getQuarterlyEarnings } from '@/lib/sec-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const earnings = await getQuarterlyEarnings(symbol);

    // Return the last 4 quarters (or fewer if not available)
    return NextResponse.json({
      symbol,
      earnings: earnings.slice(0, 4),
      source: 'SEC EDGAR',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Error fetching SEC earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEC earnings data' },
      { status: 500 }
    );
  }
}
