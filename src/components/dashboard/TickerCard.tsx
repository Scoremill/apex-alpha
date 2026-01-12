'use client';

import { cn, formatPercent, formatCurrency, getChangeColor } from '@/lib/utils';
import { SignalBadge, SignalDot } from './SignalBadge';
import { SparklineChart, getSparklineColor, getSparklineFillColor } from './SparklineChart';
import type { MarketData, SentimentResult, SignalResult } from '@/types';

interface TickerCardProps {
  symbol: string;
  name: string;
  marketData?: MarketData;
  signal?: SignalResult;
  sentiment?: SentimentResult;
  sparklineData?: number[];
  isLoading?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function TickerCard({
  symbol,
  name,
  marketData,
  signal,
  sentiment,
  sparklineData = [],
  isLoading = false,
  onClick,
  compact = false,
}: TickerCardProps) {
  if (isLoading) {
    return (
      <div className={cn("bg-slate-900 rounded-lg border border-slate-800", compact ? "p-3" : "p-4")}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className={cn("skeleton rounded mb-1", compact ? "h-4 w-12" : "h-5 w-16")} />
            <div className={cn("skeleton rounded", compact ? "h-3 w-20" : "h-4 w-32")} />
          </div>
          <div className={cn("skeleton rounded", compact ? "h-5 w-16" : "h-6 w-20")} />
        </div>
        <div className={cn("skeleton w-full rounded", compact ? "h-[50px]" : "h-[80px]")} />
      </div>
    );
  }

  const price = marketData?.price ?? 0;
  const changePercent = marketData?.changePercent ?? 0;
  const chartColor = getSparklineColor(sparklineData);
  const fillColor = getSparklineFillColor(sparklineData);

  // Compact mode for top movers
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'bg-slate-900 rounded-lg border border-slate-800 overflow-hidden',
          'card-hover cursor-pointer group'
        )}
      >
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100">{symbol}</h3>
              <p className="text-[10px] text-slate-500 truncate max-w-[80px]">{name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-100">
                {formatCurrency(price)}
              </p>
              <p className={cn('text-xs font-medium', getChangeColor(changePercent))}>
                {formatPercent(changePercent)}
              </p>
            </div>
          </div>
          {/* Compact Sparkline */}
          <div className="relative">
            {sparklineData.length > 0 ? (
              <SparklineChart
                data={sparklineData}
                width={180}
                height={50}
                color={chartColor}
                fillColor={fillColor}
                lineWidth={1}
              />
            ) : (
              <div className="h-[50px] flex items-center justify-center text-slate-600 text-[10px]">
                No chart
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-slate-900 rounded-lg border border-slate-800 overflow-hidden',
        'card-hover cursor-pointer group'
      )}
    >
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">{symbol}</h3>
              {signal && <SignalDot action={signal.action} />}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[150px]">
              {name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold text-slate-100">
              {formatCurrency(price)}
            </p>
            <p className={cn('text-sm font-medium', getChangeColor(changePercent))}>
              {formatPercent(changePercent)}
            </p>
          </div>
        </div>
      </div>

      {/* Sparkline Chart */}
      <div className="relative px-2">
        {sparklineData.length > 0 ? (
          <SparklineChart
            data={sparklineData}
            width={280}
            height={80}
            color={chartColor}
            fillColor={fillColor}
            lineWidth={1.5}
          />
        ) : (
          <div className="h-[80px] flex items-center justify-center text-slate-600 text-xs">
            Loading chart...
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 pt-2 border-t border-slate-800/50">
        <div className="flex items-center justify-between">
          {sentiment && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-xs font-medium',
                  sentiment.label === 'Bullish' && 'text-green-500',
                  sentiment.label === 'Bearish' && 'text-red-500',
                  sentiment.label === 'Neutral' && 'text-slate-400'
                )}
              >
                {sentiment.label}
              </span>
              <span className="text-xs text-slate-600">Sentiment</span>
            </div>
          )}
          {signal && (
            <SignalBadge
              action={signal.action}
              confidence={signal.confidence}
              size="sm"
              showConfidence
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Compact row version for lists
export function TickerRow({
  symbol,
  name,
  marketData,
  signal,
  onClick,
}: Omit<TickerCardProps, 'sentiment' | 'isLoading' | 'sparklineData'>) {
  const price = marketData?.price ?? 0;
  const changePercent = marketData?.changePercent ?? 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-slate-900/50 border border-slate-800/50',
        'hover:bg-slate-800/50 cursor-pointer transition-colors'
      )}
    >
      <div className="flex items-center gap-3">
        {signal && <SignalDot action={signal.action} />}
        <div>
          <span className="font-semibold text-slate-100">{symbol}</span>
          <span className="text-xs text-slate-500 ml-2">{name}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-100">
            {formatCurrency(price)}
          </p>
          <p className={cn('text-xs', getChangeColor(changePercent))}>
            {formatPercent(changePercent)}
          </p>
        </div>
        {signal && <SignalBadge action={signal.action} size="sm" />}
      </div>
    </div>
  );
}

export default TickerCard;
