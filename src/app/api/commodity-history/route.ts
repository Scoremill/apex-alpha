import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalData } from '@/lib/yahoo-finance';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const period = searchParams.get('period') || '3m';

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    const periodMap: Record<string, '1mo' | '3mo' | '6mo' | '1y'> = {
      '1d': '1mo',
      '1w': '1mo',
      '1m': '1mo',
      '3m': '3mo',
      '6m': '6mo',
      '1y': '1y',
      '3y': '1y',
      '5y': '1y',
      '10y': '1y',
    };

    const mappedPeriod = periodMap[period] || '3mo';
    const historicalData = await getHistoricalData(symbol, mappedPeriod);

    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 });
    }

    const dates = historicalData.map(d => d.date.toISOString().split('T')[0]);
    const prices = historicalData.map(d => d.close);

    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const change = endPrice - startPrice;
    const changePercent = (change / startPrice) * 100;
    const high = Math.max(...prices);
    const low = Math.min(...prices);

    return NextResponse.json({
      currentPrice: endPrice,
      historical: {
        dates,
        prices,
        highs: prices,
        lows: prices,
      },
      performance: {
        startPrice,
        endPrice,
        change,
        changePercent,
        high,
        low,
      },
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching commodity history:', error);
    return NextResponse.json({ error: 'Failed to fetch commodity history' }, { status: 500 });
  }
}
