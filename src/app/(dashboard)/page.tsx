'use client';

import { useState } from 'react';
import { MarketOverview } from '@/components/dashboard/MarketOverview';
import { TopMovers } from '@/components/dashboard/TopMovers';
import { cn } from '@/lib/utils';

export type TimeframeOption = '1D' | '1W' | '1M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y' | 'ALL';

const TIMEFRAME_OPTIONS: { value: TimeframeOption; label: string }[] = [
  { value: '1D', label: '1 Day' },
  { value: '1W', label: '1 Week' },
  { value: '1M', label: '1 Month' },
  { value: '6M', label: '6 Months' },
  { value: '1Y', label: '1 Year' },
  { value: '3Y', label: '3 Years' },
  { value: '5Y', label: '5 Years' },
  { value: '10Y', label: '10 Years' },
  { value: 'ALL', label: 'All Time' },
];

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1D');

  return (
    <div className="space-y-8">
      {/* Page Header with Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 mt-1">Market overview and performance</p>
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 overflow-x-auto">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeframe(option.value)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                timeframe === option.value
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Market Overview Section */}
      <MarketOverview timeframe={timeframe} />

      {/* Top Gainers & Losers Section */}
      <TopMovers timeframe={timeframe} />
    </div>
  );
}
