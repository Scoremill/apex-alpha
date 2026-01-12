'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';
import { cn, formatPercent, getChangeColor } from '@/lib/utils';

interface CommodityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
  displayName: string;
}

interface HistoricalData {
  dates: string[];
  prices: number[];
  highs: number[];
  lows: number[];
}

interface PeriodPerformance {
  startPrice: number;
  endPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
}

const TIME_PERIODS = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
  { label: '3Y', value: '3y' },
  { label: '5Y', value: '5y' },
  { label: '10Y', value: '10y' },
];

export function CommodityDetailModal({
  isOpen,
  onClose,
  symbol,
  name,
  displayName,
}: CommodityDetailModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [performanceByPeriod, setPerformanceByPeriod] = useState<Record<string, PeriodPerformance | null>>({});
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && symbol) {
      fetchAllPeriods();
    }
  }, [isOpen, symbol]);

  async function fetchAllPeriods() {
    setIsLoading(true);
    const results: Record<string, PeriodPerformance | null> = {};

    try {
      // First fetch 3m for the chart
      const response = await fetch(
        `/api/commodity-history?symbol=${encodeURIComponent(symbol)}&period=3m`
      );
      if (response.ok) {
        const data = await response.json();
        setHistoricalData(data.historical);
        setCurrentPrice(data.currentPrice);
        results['3m'] = data.performance;
      }

      // Fetch all other periods in parallel
      const otherPeriods = TIME_PERIODS.filter(p => p.value !== '3m').map(p => p.value);
      const responses = await Promise.all(
        otherPeriods.map(period =>
          fetch(`/api/commodity-history?symbol=${encodeURIComponent(symbol)}&period=${period}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        )
      );

      otherPeriods.forEach((period, index) => {
        results[period] = responses[index]?.performance ?? null;
      });

      setPerformanceByPeriod(results);
    } catch (error) {
      console.error('Error fetching commodity history:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  const getChangeIcon = (change?: number) => {
    if (!change) return <Minus className="w-5 h-5 text-slate-500" />;
    if (change > 0) return <TrendingUp className="w-5 h-5 text-green-500" />;
    return <TrendingDown className="w-5 h-5 text-red-500" />;
  };

  const chartHeight = 200;
  const chartWidth = 600;

  const renderChart = () => {
    if (!historicalData || historicalData.prices.length === 0) {
      return (
        <div className="h-[200px] flex items-center justify-center text-slate-500">
          No data available
        </div>
      );
    }

    const prices = historicalData.prices;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const points = prices.map((price, i) => {
      const x = (i / (prices.length - 1)) * chartWidth;
      const y = chartHeight - ((price - minPrice) / priceRange) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    const isPositive = prices[prices.length - 1] >= prices[0];
    const strokeColor = isPositive ? '#22c55e' : '#ef4444';

    const areaPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[200px]">
        <defs>
          <linearGradient id={`gradient-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#gradient-${symbol})`} />
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const threeMonthPerf = performanceByPeriod['3m'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 rounded-xl border border-slate-700 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{displayName}</h2>
            <p className="text-sm text-slate-400">{symbol} - {name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-100">
                ${currentPrice?.toFixed(2) ?? '--'}
              </p>
              {threeMonthPerf && (
                <div className="flex items-center gap-2 mt-1">
                  {getChangeIcon(threeMonthPerf.changePercent)}
                  <span className={cn('text-lg font-semibold', getChangeColor(threeMonthPerf.changePercent))}>
                    {threeMonthPerf.change >= 0 ? '+' : ''}{threeMonthPerf.change.toFixed(2)} ({formatPercent(threeMonthPerf.changePercent)})
                  </span>
                  <span className="text-sm text-slate-500">3M</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-slate-100">Price History (3M)</h3>
            </div>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              renderChart()
            )}
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-100 mb-3">Performance Summary</h3>
            <div className="grid grid-cols-3 gap-2">
              {TIME_PERIODS.map((period) => {
                const perf = performanceByPeriod[period.value];
                return (
                  <div key={period.value} className="flex items-center justify-between py-2 px-3 bg-slate-900/50 rounded-lg">
                    <span className="text-slate-400 text-sm">{period.label}</span>
                    <span className={cn(
                      'font-medium text-sm',
                      perf ? getChangeColor(perf.changePercent) : 'text-slate-500'
                    )}>
                      {perf ? formatPercent(perf.changePercent) : '--'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {threeMonthPerf && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400">Period Start</p>
                <p className="text-lg font-semibold text-slate-100">${threeMonthPerf.startPrice.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400">Period End</p>
                <p className="text-lg font-semibold text-slate-100">${threeMonthPerf.endPrice.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400">Period High</p>
                <p className="text-lg font-semibold text-green-500">${threeMonthPerf.high.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400">Period Low</p>
                <p className="text-lg font-semibold text-red-500">${threeMonthPerf.low.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
