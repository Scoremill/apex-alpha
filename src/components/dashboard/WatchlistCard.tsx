'use client';

import { cn, formatCurrency, formatPercent, getChangeColor } from '@/lib/utils';
import { SparklineChart, getSparklineColor, getSparklineFillColor } from './SparklineChart';
import { SignalBadge } from './SignalBadge';
import type { MarketData, SignalResult, SentimentResult } from '@/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface WatchlistCardProps {
  symbol: string;
  name: string;
  assetType?: 'stock' | 'etf' | 'index' | 'crypto';
  marketData?: MarketData;
  signal?: SignalResult;
  sentiment?: SentimentResult;
  sparklineData?: number[];
  performance?: {
    perf1M: number;
    perf3M: number;
    perf6M: number;
  };
  isLoading?: boolean;
  onClick?: () => void;
}

export function WatchlistCard({
  symbol,
  name,
  assetType,
  marketData,
  signal,
  sentiment,
  sparklineData = [],
  performance,
  isLoading = false,
  onClick,
}: WatchlistCardProps) {
  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 h-full">
        <div className="skeleton h-5 w-16 rounded mb-2" />
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="skeleton h-8 w-20 rounded mb-4" />
        <div className="skeleton h-[80px] w-full rounded mb-4" />
        <div className="flex gap-2">
          <div className="skeleton h-6 w-12 rounded" />
          <div className="skeleton h-6 w-12 rounded" />
          <div className="skeleton h-6 w-12 rounded" />
        </div>
      </div>
    );
  }

  const chartColor = getSparklineColor(sparklineData);
  const fillColor = getSparklineFillColor(sparklineData);
  const changePercent = marketData?.changePercent ?? 0;

  return (
    <div
      className={cn(
        'bg-slate-900 rounded-lg border border-slate-800 p-4 card-hover group h-full flex flex-col',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-100">{symbol}</h3>
            {assetType === 'etf' && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded">
                ETF
              </span>
            )}
            {assetType === 'stock' && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded">
                Stock
              </span>
            )}
            {signal && <SignalBadge action={signal.action} size="sm" />}
          </div>
          <p className="text-sm text-slate-500 truncate">{name}</p>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-slate-100">
          {formatCurrency(marketData?.price ?? 0)}
        </span>
        <span className={cn('text-sm font-medium flex items-center gap-0.5', getChangeColor(changePercent))}>
          {changePercent >= 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {formatPercent(changePercent)}
        </span>
      </div>

      {/* Sparkline Chart */}
      <div className="flex-1 mb-3 min-h-[80px]">
        {sparklineData.length > 0 ? (
          <SparklineChart
            data={sparklineData}
            width={200}
            height={80}
            color={chartColor}
            fillColor={fillColor}
            lineWidth={1.5}
          />
        ) : (
          <div className="h-[80px] flex items-center justify-center text-slate-600 text-xs">
            No chart data
          </div>
        )}
      </div>

      {/* Performance Stats */}
      {performance && (
        <div className="border-t border-slate-800 pt-3 mt-auto">
          <div className="grid grid-cols-3 gap-2">
            <PerformanceStat label="1M" value={performance.perf1M} />
            <PerformanceStat label="3M" value={performance.perf3M} />
            <PerformanceStat label="6M" value={performance.perf6M} />
          </div>
        </div>
      )}

      {/* Sentiment (if available) */}
      {sentiment && (
        <div className="mt-2 pt-2 border-t border-slate-800">
          <span
            className={cn(
              'text-xs font-medium',
              sentiment.label === 'Bullish' && 'text-green-500',
              sentiment.label === 'Bearish' && 'text-red-500',
              sentiment.label === 'Neutral' && 'text-slate-400'
            )}
          >
            {sentiment.label} Sentiment
          </span>
        </div>
      )}
    </div>
  );
}

function PerformanceStat({ label, value }: { label: string; value: number }) {
  const isPositive = value >= 0;
  return (
    <div className="text-center">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p
        className={cn(
          'text-sm font-semibold',
          isPositive ? 'text-green-500' : 'text-red-500'
        )}
      >
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </p>
    </div>
  );
}

export default WatchlistCard;
