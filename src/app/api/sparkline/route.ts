import { NextRequest, NextResponse } from 'next/server';
import { getMultipleSparklines } from '@/lib/yahoo-finance';

// Valid period values that match SparklinePeriod type
const VALID_PERIODS = ['1d', '1wk', '1mo', '6mo', '1y', '3y', '5y', '10y', 'max'] as const;
type SparklinePeriod = typeof VALID_PERIODS[number];

function isValidPeriod(period: string): period is SparklinePeriod {
  return VALID_PERIODS.includes(period as SparklinePeriod);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get('symbols');
    const periodParam = searchParams.get('period') || '1mo';

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

    // Validate and use the period parameter
    const period: SparklinePeriod = isValidPeriod(periodParam) ? periodParam : '1mo';

    const sparklines = await getMultipleSparklines(symbols, period);

    // Convert Map to plain object
    const result: Record<string, number[]> = {};
    sparklines.forEach((value, key) => {
      result[key] = value;
    });

    return NextResponse.json(result, {
      headers: {
        // Cache for 5 minutes since sparkline data doesn't need real-time updates
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error in sparkline API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sparkline data' },
      { status: 500 }
    );
  }
}
