'use client';

import { useEffect, useState } from 'react';
import { MarketCard } from './MarketCard';
import { MARKET_INDICES } from '@/lib/chart-img';
import type { MarketData } from '@/types';
import type { TimeframeOption } from '@/app/(dashboard)/page';

interface IndexData {
  symbol: string;
  name: string;
  displayName: string;
  data?: MarketData;
  sparkline?: number[];
}

interface MarketOverviewProps {
  timeframe?: TimeframeOption;
}

// Map timeframe to sparkline API period parameter
function getSparklinePeriod(timeframe: TimeframeOption): string {
  switch (timeframe) {
    case '1D': return '1d';
    case '1W': return '1wk';
    case '1M': return '1mo';
    case '6M': return '6mo';
    case '1Y': return '1y';
    case '3Y': return '3y';
    case '5Y': return '5y';
    case '10Y': return '10y';
    case 'ALL': return 'max';
    default: return '1mo';
  }
}

// Get display label for returns based on timeframe
function getReturnsLabel(timeframe: TimeframeOption): string {
  switch (timeframe) {
    case '1D': return 'One-Day Returns';
    case '1W': return 'One-Week Returns';
    case '1M': return 'One-Month Returns';
    case '6M': return '6-Month Returns';
    case '1Y': return 'YTD Returns';
    case '3Y': return '3-Year Returns';
    case '5Y': return '5-Year Returns';
    case '10Y': return '10-Year Returns';
    case 'ALL': return 'All-Time Returns';
    default: return 'Returns';
  }
}

export function MarketOverview({ timeframe = '1D' }: MarketOverviewProps) {
  const [indices, setIndices] = useState<IndexData[]>(
    MARKET_INDICES.map((idx) => ({
      symbol: idx.symbol,
      name: idx.name,
      displayName: idx.displayName,
    }))
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const period = getSparklinePeriod(timeframe);

        // Fetch market data and sparkline data in parallel
        const [marketResponse, sparklineResponse] = await Promise.all([
          fetch('/api/market-data?' + new URLSearchParams({
            symbols: MARKET_INDICES.map((i) => i.symbol).join(','),
          })),
          fetch('/api/sparkline?' + new URLSearchParams({
            symbols: MARKET_INDICES.map((i) => i.symbol).join(','),
            period,
          })),
        ]);

        const marketData = marketResponse.ok ? await marketResponse.json() : {};
        const sparklineData = sparklineResponse.ok ? await sparklineResponse.json() : {};

        setIndices((prev) =>
          prev.map((idx) => ({
            ...idx,
            data: marketData[idx.symbol],
            sparkline: sparklineData[idx.symbol] || [],
          }))
        );
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeframe]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100">
          Broad Market Performance
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Charts</span>
          <span className="text-xs text-blue-500 ml-2">Summary</span>
          <span className="text-xs text-slate-500 ml-2">{getReturnsLabel(timeframe)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {indices.map((idx) => (
          <MarketCard
            key={idx.symbol}
            symbol={idx.symbol}
            name={idx.displayName}
            price={idx.data?.price}
            changePercent={idx.data?.changePercent}
            sparklineData={idx.sparkline}
            isLoading={isLoading}
            timeframe={timeframe}
          />
        ))}
      </div>
    </section>
  );
}

export default MarketOverview;
