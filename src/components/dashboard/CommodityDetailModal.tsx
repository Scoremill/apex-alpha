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
  source?: 'YAHOO' | 'FRED';
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

interface QuarterlyPerformance {
  quarter: string;
  year: number;
  startPrice: number;
  endPrice: number;
  change: number;
  changePercent: number;
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
  source = 'YAHOO',
}: CommodityDetailModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [performanceByPeriod, setPerformanceByPeriod] = useState<Record<string, PeriodPerformance | null>>({});
  const [quarterlyPerf, setQuarterlyPerf] = useState<QuarterlyPerformance[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && symbol) {
      if (source === 'FRED') {
        fetchFredData();
      } else {
        fetchAllPeriods();
      }
    }
  }, [isOpen, symbol, source]);

  async function fetchFredData() {
    setIsLoading(true);
    try {
      // Fetch 5 years of data for trends
      const today = new Date();
      const fiveYearsAgo = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());

      const response = await fetch(
        `/api/fred-data?series_id=${symbol}&start_date=${fiveYearsAgo.toISOString().split('T')[0]}`
      );

      if (response.ok) {
        const data = await response.json();
        const obs = data.observations || [];

        if (obs.length > 0) {
          const prices = obs.map((o: any) => parseFloat(o.value));
          const dates = obs.map((o: any) => o.date);
          const current = prices[prices.length - 1];

          setCurrentPrice(current);
          setHistoricalData({
            dates,
            prices,
            highs: prices, // FRED only gives one value per period usually
            lows: prices,
          });

          // Calculate Quarterly Trends
          const quarterly: QuarterlyPerformance[] = [];

          // Helper to get quarter from date
          const getQuarter = (d: Date) => Math.floor(d.getMonth() / 3) + 1;

          // Group by quarter
          const byQuarter: Record<string, { start: number; end: number; year: number; q: number }> = {};

          obs.forEach((o: any) => {
            const date = new Date(o.date);
            const key = `${date.getFullYear()}-Q${getQuarter(date)}`;
            const price = parseFloat(o.value);

            if (!byQuarter[key]) {
              byQuarter[key] = { start: price, end: price, year: date.getFullYear(), q: getQuarter(date) };
            } else {
              byQuarter[key].end = price; // Update end price as we go
            }
          });

          // Convert to array and filter for last 4-6 quarters
          const qKeys = Object.keys(byQuarter).sort().reverse().slice(0, 5); // Last 5 quarters

          qKeys.forEach(key => {
            const q = byQuarter[key];
            quarterly.push({
              quarter: `Q${q.q}`,
              year: q.year,
              startPrice: q.start,
              endPrice: q.end,
              change: q.end - q.start,
              changePercent: ((q.end - q.start) / q.start) * 100
            });
          });

          setQuarterlyPerf(quarterly);
        }
      }
    } catch (error) {
      console.error('Error fetching FRED data:', error);
    } finally {
      setIsLoading(false);
    }
  }

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
    const dates = historicalData.dates;
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

    // Generate quarter labels for FRED data (show every ~12 months)
    const quarterLabels: { x: number; label: string }[] = [];
    if (source === 'FRED' && dates.length > 0) {
      const step = Math.floor(dates.length / 5); // Show ~5 labels
      for (let i = 0; i < dates.length; i += step) {
        const date = new Date(dates[i]);
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        const year = date.getFullYear();
        const x = (i / (dates.length - 1)) * chartWidth;
        quarterLabels.push({ x, label: `Q${quarter} ${year}` });
      }
    }

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} className="w-full h-[230px]">
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
          {/* Quarter labels for FRED data */}
          {source === 'FRED' && quarterLabels.map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={chartHeight + 20}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
              fontFamily="system-ui"
            >
              {label.label}
            </text>
          ))}
        </svg>
        {source === 'FRED' && (
          <div className="mt-2 text-xs text-slate-500 text-right">
            Data Source: FRED-St Louis
          </div>
        )}
      </div>
    );
  };

  const threeMonthPerf = performanceByPeriod['3m']; // Standard perf

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 rounded-xl border border-slate-700 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div>
            <h2 className="text-xl font-bold text-slate-100">{displayName}</h2>
            <p className="text-sm text-slate-400">
              {symbol} - {name} {source === 'FRED' && '(FRED-St Louis Index)'}
            </p>
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
                {source === 'FRED' ? '' : '$'}{currentPrice?.toFixed(2) ?? '--'}
              </p>
              {/* Show Latest Quarter Change if FRED, else 3M */}
              {source === 'FRED' && quarterlyPerf.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  {getChangeIcon(quarterlyPerf[0].changePercent)}
                  <span className={cn('text-lg font-semibold', getChangeColor(quarterlyPerf[0].changePercent))}>
                    {quarterlyPerf[0].change >= 0 ? '+' : ''}{quarterlyPerf[0].change.toFixed(2)} ({formatPercent(quarterlyPerf[0].changePercent)})
                  </span>
                  <span className="text-sm text-slate-500">Latest Quarter ({quarterlyPerf[0].quarter} {quarterlyPerf[0].year})</span>
                </div>
              )}
              {source !== 'FRED' && threeMonthPerf && (
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
              <h3 className="font-semibold text-slate-100">Price History {source === 'FRED' ? '(5Y)' : '(3M)'}</h3>
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
            <h3 className="font-semibold text-slate-100 mb-3">
              {source === 'FRED' ? 'Quarterly Trends' : 'Performance Summary'}
            </h3>

            {source === 'FRED' ? (
              <div className="grid grid-cols-1 gap-2">
                <div className="grid grid-cols-4 px-3 py-2 text-sm text-slate-500 font-medium">
                  <span>Quarter</span>
                  <span className="text-right">Start</span>
                  <span className="text-right">End</span>
                  <span className="text-right">Change</span>
                </div>
                {quarterlyPerf.map((qp) => (
                  <div key={`${qp.year}-${qp.quarter}`} className="grid grid-cols-4 px-3 py-2 bg-slate-900/50 rounded-lg text-sm">
                    <span className="text-slate-300">{qp.quarter} {qp.year}</span>
                    <span className="text-right text-slate-400">{qp.startPrice.toFixed(2)}</span>
                    <span className="text-right text-slate-400">{qp.endPrice.toFixed(2)}</span>
                    <span className={cn("text-right font-medium", getChangeColor(qp.changePercent))}>
                      {formatPercent(qp.changePercent)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
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
            )}
          </div>

          {source !== 'FRED' && threeMonthPerf && (
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
