'use client';

import { useEffect, useState } from 'react';
import { MarketCard } from '@/components/dashboard/MarketCard';
import { StockDetailModal } from '@/components/dashboard/StockDetailModal';
import { MARKET_INDICES } from '@/lib/chart-img';
import type { MarketData } from '@/types';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn, formatPercent, getChangeColor } from '@/lib/utils';

interface NewsArticle {
  title: string;
  link: string;
  publisher: string;
  publishedAt: Date;
}

interface IndexData {
  symbol: string;
  name: string;
  displayName: string;
  data?: MarketData;
  sparkline?: number[];
  news?: NewsArticle[];
}

// Additional sectors/indices for the markets page
const SECTOR_ETFS = [
  { symbol: 'XLK', name: 'Technology Select Sector', displayName: 'Technology' },
  { symbol: 'XLF', name: 'Financial Select Sector', displayName: 'Financials' },
  { symbol: 'XLV', name: 'Health Care Select Sector', displayName: 'Healthcare' },
  { symbol: 'XLE', name: 'Energy Select Sector', displayName: 'Energy' },
  { symbol: 'XLY', name: 'Consumer Discretionary', displayName: 'Consumer Disc.' },
  { symbol: 'XLP', name: 'Consumer Staples', displayName: 'Consumer Staples' },
  { symbol: 'XLI', name: 'Industrial Select Sector', displayName: 'Industrials' },
  { symbol: 'XLB', name: 'Materials Select Sector', displayName: 'Materials' },
];

export default function MarketsPage() {
  const [indices, setIndices] = useState<IndexData[]>(
    MARKET_INDICES.map((idx) => ({
      symbol: idx.symbol,
      name: idx.name,
      displayName: idx.displayName,
    }))
  );
  const [sectors, setSectors] = useState<IndexData[]>(
    SECTOR_ETFS.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      displayName: s.displayName,
    }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<IndexData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const allSymbols = [
          ...MARKET_INDICES.map((i) => i.symbol),
          ...SECTOR_ETFS.map((s) => s.symbol),
        ];

        const [marketResponse, sparklineResponse, newsResponse] = await Promise.all([
          fetch('/api/market-data?' + new URLSearchParams({
            symbols: allSymbols.join(','),
          })),
          fetch('/api/sparkline?' + new URLSearchParams({
            symbols: allSymbols.join(','),
          })),
          fetch('/api/news?' + new URLSearchParams({
            symbols: allSymbols.join(','),
            limit: '2',
          })),
        ]);

        const marketData = marketResponse.ok ? await marketResponse.json() : {};
        const sparklineData = sparklineResponse.ok ? await sparklineResponse.json() : {};
        const newsData = newsResponse.ok ? await newsResponse.json() : {};

        setIndices((prev) =>
          prev.map((idx) => ({
            ...idx,
            data: marketData[idx.symbol],
            sparkline: sparklineData[idx.symbol] || [],
            news: newsData[idx.symbol] || [],
          }))
        );

        setSectors((prev) =>
          prev.map((s) => ({
            ...s,
            data: marketData[s.symbol],
            sparkline: sparklineData[s.symbol] || [],
            news: newsData[s.symbol] || [],
          }))
        );
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate market summary stats
  const gainers = indices.filter((i) => (i.data?.changePercent ?? 0) > 0).length;
  const losers = indices.filter((i) => (i.data?.changePercent ?? 0) < 0).length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Markets</h1>
        <p className="text-slate-400 mt-1">Track major indices, sectors, and commodities</p>
      </div>

      {/* Market Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Advancing</p>
              <p className="text-xl font-bold text-green-500">{gainers}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Declining</p>
              <p className="text-xl font-bold text-red-500">{losers}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">VIX</p>
              <p className={cn(
                'text-xl font-bold',
                getChangeColor(indices.find((i) => i.symbol === '^VIX')?.data?.changePercent ?? 0)
              )}>
                {indices.find((i) => i.symbol === '^VIX')?.data?.price?.toFixed(2) ?? '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Major Indices */}
      <section>
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Major Indices</h2>
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
              onClick={() => setSelectedItem(idx)}
              timeframe="30D"
              news={idx.news}
            />
          ))}
        </div>
      </section>

      {/* Sector Performance */}
      <section>
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Sector Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sectors.map((sector) => (
            <MarketCard
              key={sector.symbol}
              symbol={sector.symbol}
              name={sector.displayName}
              price={sector.data?.price}
              changePercent={sector.data?.changePercent}
              sparklineData={sector.sparkline}
              isLoading={isLoading}
              onClick={() => setSelectedItem(sector)}
              timeframe="30D"
              news={sector.news}
            />
          ))}
        </div>
      </section>

      {/* Stock Detail Modal */}
      <StockDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        symbol={selectedItem?.symbol || ''}
        name={selectedItem?.name || ''}
      />
    </div>
  );
}
