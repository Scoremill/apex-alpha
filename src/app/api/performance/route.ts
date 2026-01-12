import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface ChartQuote {
  date: Date;
  close: number | null;
}

interface ChartResult {
  quotes?: ChartQuote[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get('symbols');

    if (!symbolsParam) {
      return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 });
    }

    const symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase());
    const result: Record<string, { perf1M: number; perf3M: number; perf6M: number }> = {};

    // Process symbols in batches
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(async (symbol) => {
        try {
          const now = new Date();
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

          const chartResult = await yahooFinance.chart(symbol, {
            period1: sixMonthsAgo,
            period2: now,
            interval: '1d',
          }) as ChartResult;

          const quotes = chartResult?.quotes?.filter((q): q is ChartQuote & { close: number } => q.close !== null) || [];

          if (quotes.length < 2) {
            return { symbol, perf1M: 0, perf3M: 0, perf6M: 0 };
          }

          const currentPrice = quotes[quotes.length - 1].close;

          // Find prices at different periods
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

          // Find closest price to each date
          const findClosestPrice = (targetDate: Date): number => {
            const targetTime = targetDate.getTime();
            let closest = quotes[0];
            let minDiff = Math.abs(new Date(quotes[0].date).getTime() - targetTime);

            for (const quote of quotes) {
              const diff = Math.abs(new Date(quote.date).getTime() - targetTime);
              if (diff < minDiff) {
                minDiff = diff;
                closest = quote;
              }
            }
            return closest.close;
          };

          const price1M = findClosestPrice(oneMonthAgo);
          const price3M = findClosestPrice(threeMonthsAgo);
          const price6M = quotes[0].close; // First price in our 6-month range

          const perf1M = price1M > 0 ? ((currentPrice - price1M) / price1M) * 100 : 0;
          const perf3M = price3M > 0 ? ((currentPrice - price3M) / price3M) * 100 : 0;
          const perf6M = price6M > 0 ? ((currentPrice - price6M) / price6M) * 100 : 0;

          return { symbol, perf1M, perf3M, perf6M };
        } catch (error) {
          console.error(`Error fetching performance for ${symbol}:`, error);
          return { symbol, perf1M: 0, perf3M: 0, perf6M: 0 };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ symbol, perf1M, perf3M, perf6M }) => {
        result[symbol] = { perf1M, perf3M, perf6M };
      });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error in performance API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
