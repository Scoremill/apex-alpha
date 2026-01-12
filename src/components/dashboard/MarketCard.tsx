'use client';

import { cn, formatPercent, getChangeColor, formatCryptoCurrency } from '@/lib/utils';
import { SparklineChart, getSparklineColor, getSparklineFillColor } from './SparklineChart';
import { Clock, ExternalLink } from 'lucide-react';

interface NewsArticle {
  title: string;
  link: string;
  publisher: string;
  publishedAt: Date;
}

interface MarketCardProps {
  symbol: string;
  name: string;
  price?: number;
  changePercent?: number;
  sparklineData?: number[];
  isLoading?: boolean;
  onClick?: () => void;
  timeframe?: string;
  news?: NewsArticle[];
  isCrypto?: boolean;
}

export function MarketCard({
  symbol,
  name,
  price,
  changePercent = 0,
  sparklineData = [],
  isLoading = false,
  onClick,
  timeframe = '30D',
  news = [],
  isCrypto = false,
}: MarketCardProps) {
  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="p-4">
          <div className="skeleton h-4 w-24 rounded mb-2" />
          <div className="skeleton h-6 w-16 rounded" />
        </div>
        <div className="skeleton h-[100px] w-full" />
        <div className="p-4 pt-0 space-y-2">
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-3/4 rounded" />
        </div>
      </div>
    );
  }

  const chartColor = getSparklineColor(sparklineData);
  const fillColor = getSparklineFillColor(sparklineData);

  return (
    <div
      className={cn(
        'bg-slate-900 rounded-lg border border-slate-800 overflow-hidden card-hover group',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-300">{name}</h3>
            {price !== undefined && (
              <p className="text-lg font-semibold text-slate-100 mt-1">
                {isCrypto ? formatCryptoCurrency(price) : price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            )}
          </div>
          <span
            className={cn(
              'text-sm font-semibold',
              getChangeColor(changePercent)
            )}
          >
            {formatPercent(changePercent)}
          </span>
        </div>
      </div>

      {/* Sparkline Chart */}
      <div className="relative px-2">
        {sparklineData.length > 0 ? (
          <SparklineChart
            data={sparklineData}
            width={300}
            height={100}
            color={chartColor}
            fillColor={fillColor}
            lineWidth={2}
          />
        ) : (
          <div className="h-[100px] flex items-center justify-center text-slate-600 text-xs">
            Loading chart...
          </div>
        )}
        {/* Timeframe indicator */}
        <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10px] text-slate-500 bg-slate-900/80 px-1.5 py-0.5 rounded">
          <Clock className="w-2.5 h-2.5" />
          {timeframe}
        </div>
      </div>

      {/* News Headlines */}
      {news.length > 0 && (
        <div className="px-4 pb-3 pt-2 border-t border-slate-800 mt-2">
          <div className="space-y-1.5">
            {news.slice(0, 2).map((article, index) => (
              <a
                key={index}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group/news flex items-start gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-0 group-hover/news:opacity-100 transition-opacity" />
                <span className="line-clamp-1">{article.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketCard;
