'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { TickerCard } from './TickerCard';
import { StockDetailModal } from './StockDetailModal';
import type { MarketData, SignalResult, SentimentResult } from '@/types';
import type { TimeframeOption } from '@/app/(dashboard)/page';
import { cn } from '@/lib/utils';

interface StockData {
  symbol: string;
  name: string;
  marketData?: MarketData;
  signal?: SignalResult;
  sentiment?: SentimentResult;
  sparkline?: number[];
}

interface TopMoversProps {
  timeframe?: TimeframeOption;
}

// A broader list of popular stocks to track for gainers/losers
const TRACKED_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { symbol: 'META', name: 'Meta Platforms, Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'NFLX', name: 'Netflix, Inc.' },
  { symbol: 'CRM', name: 'Salesforce, Inc.' },
  { symbol: 'ORCL', name: 'Oracle Corporation' },
  { symbol: 'INTC', name: 'Intel Corporation' },
  { symbol: 'CSCO', name: 'Cisco Systems, Inc.' },
  { symbol: 'ADBE', name: 'Adobe Inc.' },
  { symbol: 'PYPL', name: 'PayPal Holdings, Inc.' },
  { symbol: 'DIS', name: 'The Walt Disney Company' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'MA', name: 'Mastercard Incorporated' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'BAC', name: 'Bank of America Corporation' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'HD', name: 'The Home Depot, Inc.' },
  { symbol: 'PG', name: 'Procter & Gamble Co.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
  { symbol: 'CVX', name: 'Chevron Corporation' },
  { symbol: 'KO', name: 'The Coca-Cola Company' },
  { symbol: 'PEP', name: 'PepsiCo, Inc.' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation' },
];

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

// Get display label for timeframe
function getTimeframeLabel(timeframe: TimeframeOption): string {
  switch (timeframe) {
    case '1D': return 'today';
    case '1W': return 'this week';
    case '1M': return 'this month';
    case '6M': return 'past 6 months';
    case '1Y': return 'this year';
    case '3Y': return 'past 3 years';
    case '5Y': return 'past 5 years';
    case '10Y': return 'past 10 years';
    case 'ALL': return 'all time';
    default: return 'today';
  }
}

export function TopMovers({ timeframe = '1D' }: TopMoversProps) {
  const [allStocks, setAllStocks] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeframe]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const symbols = TRACKED_STOCKS.map((s) => s.symbol).join(',');
      const period = getSparklinePeriod(timeframe);

      const [marketResponse, sparklineResponse] = await Promise.all([
        fetch(`/api/market-data?symbols=${symbols}`),
        fetch(`/api/sparkline?symbols=${symbols}&period=${period}`),
      ]);

      const marketData = marketResponse.ok ? await marketResponse.json() : {};
      const sparklineData = sparklineResponse.ok ? await sparklineResponse.json() : {};

      const stocksWithData = TRACKED_STOCKS.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        marketData: marketData[stock.symbol],
        sparkline: sparklineData[stock.symbol] || [],
      }));

      setAllStocks(stocksWithData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching top movers:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Sort and get top 5 gainers and losers
  const stocksWithChange = allStocks.filter((s) => s.marketData?.changePercent !== undefined);
  const sortedByChange = [...stocksWithChange].sort(
    (a, b) => (b.marketData?.changePercent ?? 0) - (a.marketData?.changePercent ?? 0)
  );

  const topGainers = sortedByChange.slice(0, 5);
  const topLosers = sortedByChange.slice(-5).reverse();

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Market Movers</h2>
          <p className="text-sm text-slate-500">
            Top performers and decliners {getTimeframeLabel(timeframe)}
            {lastUpdated && (
              <span className="ml-2">
                (Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Top Gainers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-green-500/10 rounded-lg">
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <h3 className="text-sm font-medium text-green-500">Top 5 Gainers</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {topGainers.map((stock) => (
            <TickerCard
              key={stock.symbol}
              symbol={stock.symbol}
              name={stock.name}
              marketData={stock.marketData}
              sparklineData={stock.sparkline}
              isLoading={isLoading}
              onClick={() => setSelectedStock(stock)}
              compact
            />
          ))}
          {topGainers.length === 0 && !isLoading && (
            <div className="col-span-5 text-center py-8 text-slate-500">
              No gainers data available
            </div>
          )}
        </div>
      </div>

      {/* Top Losers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-red-500/10 rounded-lg">
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <h3 className="text-sm font-medium text-red-500">Top 5 Losers</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {topLosers.map((stock) => (
            <TickerCard
              key={stock.symbol}
              symbol={stock.symbol}
              name={stock.name}
              marketData={stock.marketData}
              sparklineData={stock.sparkline}
              isLoading={isLoading}
              onClick={() => setSelectedStock(stock)}
              compact
            />
          ))}
          {topLosers.length === 0 && !isLoading && (
            <div className="col-span-5 text-center py-8 text-slate-500">
              No losers data available
            </div>
          )}
        </div>
      </div>

      {/* Stock Detail Modal */}
      <StockDetailModal
        isOpen={!!selectedStock}
        onClose={() => setSelectedStock(null)}
        symbol={selectedStock?.symbol || ''}
        name={selectedStock?.name || ''}
      />
    </section>
  );
}

export default TopMovers;
