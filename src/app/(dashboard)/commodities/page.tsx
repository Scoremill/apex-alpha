'use client';

import React, { useEffect, useState } from 'react';
import { cn, formatPercent, getChangeColor } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CommodityDetailModal } from '@/components/dashboard/CommodityDetailModal';

interface CommodityData {
  symbol: string;
  name: string;
  displayName: string;
  price?: number;
  change?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  volume?: string;
  source?: 'YAHOO' | 'FRED';
  fredSeriesId?: string;
}

const COMMODITIES: (Partial<CommodityData> & { symbol: string; category: string })[] = [
  { symbol: 'GC=F', name: 'Gold Futures', displayName: 'Gold', category: 'Precious Metals', source: 'YAHOO' },
  { symbol: 'SI=F', name: 'Silver Futures', displayName: 'Silver', category: 'Precious Metals', source: 'YAHOO' },
  { symbol: 'PL=F', name: 'Platinum Futures', displayName: 'Platinum', category: 'Precious Metals', source: 'YAHOO' },
  { symbol: 'PA=F', name: 'Palladium Futures', displayName: 'Palladium', category: 'Precious Metals', source: 'YAHOO' },
  { symbol: 'CL=F', name: 'Crude Oil WTI', displayName: 'Crude Oil', category: 'Energy', source: 'YAHOO' },
  { symbol: 'BZ=F', name: 'Brent Crude Oil', displayName: 'Brent', category: 'Energy', source: 'YAHOO' },
  { symbol: 'NG=F', name: 'Natural Gas', displayName: 'Natural Gas', category: 'Energy', source: 'YAHOO' },
  { symbol: 'HO=F', name: 'Heating Oil', displayName: 'Heating Oil', category: 'Energy', source: 'YAHOO' },
  { symbol: 'RB=F', name: 'RBOB Gasoline', displayName: 'Gasoline', category: 'Energy', source: 'YAHOO' },
  { symbol: 'ZC=F', name: 'Corn Futures', displayName: 'Corn', category: 'Agriculture', source: 'YAHOO' },
  { symbol: 'ZW=F', name: 'Wheat Futures', displayName: 'Wheat', category: 'Agriculture', source: 'YAHOO' },
  { symbol: 'ZS=F', name: 'Soybean Futures', displayName: 'Soybeans', category: 'Agriculture', source: 'YAHOO' },
  { symbol: 'KC=F', name: 'Coffee Futures', displayName: 'Coffee', category: 'Agriculture', source: 'YAHOO' },
  { symbol: 'SB=F', name: 'Sugar Futures', displayName: 'Sugar', category: 'Agriculture', source: 'YAHOO' },
  { symbol: 'CC=F', name: 'Cocoa Futures', displayName: 'Cocoa', category: 'Agriculture', source: 'YAHOO' },
  { symbol: 'CT=F', name: 'Cotton Futures', displayName: 'Cotton', category: 'Agriculture', source: 'YAHOO' },
  { symbol: 'HG=F', name: 'Copper Futures', displayName: 'Copper', category: 'Industrial Metals', source: 'YAHOO' },
  { symbol: 'ALI=F', name: 'Aluminum Futures', displayName: 'Aluminum', category: 'Industrial Metals', source: 'YAHOO' },
  { symbol: 'LE=F', name: 'Live Cattle', displayName: 'Live Cattle', category: 'Livestock', source: 'YAHOO' },
  { symbol: 'HE=F', name: 'Lean Hogs', displayName: 'Lean Hogs', category: 'Livestock', source: 'YAHOO' },
  // Changed Lumber to use FRED Source (WPS081)
  {
    symbol: 'WPS081',
    name: 'Lumber & Wood Products Index',
    displayName: 'Lumber',
    category: 'Homebuilding',
    source: 'FRED',
    fredSeriesId: 'WPS081'
  },
  // Changed Aluminum to use FRED Source (PALUMUSDM)
  {
    symbol: 'PALUMUSDM',
    name: 'Global Price of Aluminum',
    displayName: 'Aluminum',
    category: 'Homebuilding',
    source: 'FRED',
    fredSeriesId: 'PALUMUSDM'
  },
  // Changed Oil (Gas) to use FRED Source (WTISPLC)
  {
    symbol: 'WTISPLC',
    name: 'Crude Oil Prices: West Texas Intermediate',
    displayName: 'Oil (Gas)',
    category: 'Homebuilding',
    source: 'FRED',
    fredSeriesId: 'WTISPLC'
  },
  { symbol: 'X', name: 'United States Steel', displayName: 'Steel', category: 'Homebuilding', source: 'YAHOO' },
  { symbol: 'CUT', name: 'Invesco MSCI Timber ETF', displayName: 'OSB/Studs', category: 'Homebuilding', source: 'YAHOO' },
  { symbol: 'EXP', name: 'Eagle Materials', displayName: 'Gypsum (Drywall)', category: 'Homebuilding', source: 'YAHOO' },
  { symbol: 'MLM', name: 'Martin Marietta', displayName: 'Concrete/Aggregates', category: 'Homebuilding', source: 'YAHOO' },
  { symbol: 'SHW', name: 'Sherwin-Williams', displayName: 'Resin (Paint)', category: 'Homebuilding', source: 'YAHOO' },
  { symbol: 'WY', name: 'Weyerhaeuser', displayName: 'Wood Products', category: 'Homebuilding', source: 'YAHOO' },
  { symbol: 'BCC', name: 'Boise Cascade', displayName: 'Plywood/OSB', category: 'Homebuilding', source: 'YAHOO' },
];

const CATEGORIES = ['Precious Metals', 'Energy', 'Agriculture', 'Industrial Metals', 'Livestock', 'Homebuilding'];

export default function CommoditiesPage() {
  const [commodities, setCommodities] = useState<(CommodityData & { category: string; source?: string; fredSeriesId?: string })[]>(
    COMMODITIES.map((c) => ({ ...c, category: c.category, source: c.source || 'YAHOO' } as any))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCommodity, setSelectedCommodity] = useState<(CommodityData & { category: string; source?: string; fredSeriesId?: string }) | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const yahooSymbols = COMMODITIES.filter(c => c.source === 'YAHOO' || !c.source).map((c) => c.symbol);
        const fredItems = COMMODITIES.filter(c => c.source === 'FRED');

        // Parallel fetch for Yahoo and FRED data
        const [yahooResponse, ...fredResponses] = await Promise.all([
          fetch(`/api/market-data?symbols=${yahooSymbols.join(',')}`),
          ...fredItems.map(item => fetch(`/api/fred-data?series_id=${item.fredSeriesId}`))
        ]);

        const marketData = yahooResponse.ok ? await yahooResponse.json() : {};
        const fredDataResults = await Promise.all(fredResponses.map(res => res.ok ? res.json() : null));

        setCommodities(prev => prev.map(c => {
          if (c.source === 'FRED' && c.fredSeriesId) {
            // Find corresponding FRED data
            const fredIndex = fredItems.findIndex(f => f.symbol === c.symbol);
            const data = fredDataResults[fredIndex];

            if (data && data.observations && data.observations.length >= 2) {
              // FRED data is usually monthly. Get last two points for change.
              const observations = data.observations;
              const latest = observations[observations.length - 1];
              const previous = observations[observations.length - 2];
              const price = parseFloat(latest.value);
              const prevPrice = parseFloat(previous.value);
              const change = price - prevPrice;
              const changePercent = (change / prevPrice) * 100;

              return {
                ...c,
                price,
                change,
                changePercent,
                high: Math.max(...observations.slice(-12).map((o: any) => parseFloat(o.value))), // 12-month high
                low: Math.min(...observations.slice(-12).map((o: any) => parseFloat(o.value))),  // 12-month low
                volume: 'N/A' // Indexes don't usually have volume
              };
            }
            return c;
          }

          // Existing Yahoo Finance Logic
          return {
            ...c,
            price: marketData[c.symbol]?.price,
            change: marketData[c.symbol]?.change,
            changePercent: marketData[c.symbol]?.changePercent,
            high: marketData[c.symbol]?.high,
            low: marketData[c.symbol]?.low,
            volume: marketData[c.symbol]?.volume?.toLocaleString(),
          };
        }));

      } catch (error) {
        console.error('Error fetching commodity data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60 * 1000); // 1 min update (likely overkill for FRED but fine for Yahoo)
    return () => clearInterval(interval);
  }, []);

  const filteredCommodities = selectedCategory
    ? commodities.filter((c) => c.category === selectedCategory)
    : commodities;

  const groupedCommodities = CATEGORIES.reduce((acc, category) => {
    acc[category] = filteredCommodities.filter((c) => c.category === category);
    return acc;
  }, {} as Record<string, typeof commodities>);

  const getChangeIcon = (changePercent?: number) => {
    if (!changePercent) return <Minus className="w-4 h-4 text-slate-500" />;
    if (changePercent > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Commodities</h1>
        <p className="text-slate-400 mt-1">Track futures prices across major commodity markets</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            !selectedCategory
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          )}
        >
          All
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Commodity</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-400">Price</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-400">Change</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-400">% Change</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-400">High</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-400">Low</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-400">Trend</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedCommodities).map(([category, items]) => {
                if (items.length === 0) return null;
                return (
                  <React.Fragment key={category}>
                    <tr className="bg-blue-900/40 border-l-4 border-l-blue-500">
                      <td colSpan={7} className="px-6 py-3">
                        <span className="text-sm font-bold text-blue-300 uppercase tracking-wide">{category}</span>
                      </td>
                    </tr>
                    {items.map((commodity) => (
                      <tr
                        key={commodity.symbol}
                        onClick={() => setSelectedCommodity(commodity)}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-100">{commodity.displayName}</p>
                            <p className="text-xs text-slate-500">{commodity.symbol}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isLoading ? (
                            <div className="h-5 w-20 bg-slate-800 rounded animate-pulse ml-auto" />
                          ) : (
                            <span className="font-mono text-slate-100">
                              ${commodity.price?.toFixed(2) ?? '--'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isLoading ? (
                            <div className="h-5 w-16 bg-slate-800 rounded animate-pulse ml-auto" />
                          ) : (
                            <span className={cn('font-mono', getChangeColor(commodity.changePercent ?? 0))}>
                              {commodity.change !== undefined
                                ? `${commodity.change >= 0 ? '+' : ''}${commodity.change.toFixed(2)}`
                                : '--'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isLoading ? (
                            <div className="h-5 w-14 bg-slate-800 rounded animate-pulse ml-auto" />
                          ) : (
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-1 rounded text-sm font-medium',
                                commodity.changePercent !== undefined && commodity.changePercent > 0
                                  ? 'bg-green-500/10 text-green-500'
                                  : commodity.changePercent !== undefined && commodity.changePercent < 0
                                    ? 'bg-red-500/10 text-red-500'
                                    : 'bg-slate-700 text-slate-400'
                              )}
                            >
                              {formatPercent(commodity.changePercent ?? 0)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono text-slate-400">
                            ${commodity.high?.toFixed(2) ?? '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono text-slate-400">
                            ${commodity.low?.toFixed(2) ?? '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {getChangeIcon(commodity.changePercent)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CommodityDetailModal
        isOpen={!!selectedCommodity}
        onClose={() => setSelectedCommodity(null)}
        symbol={selectedCommodity?.symbol ?? ''}
        name={selectedCommodity?.name ?? ''}
        displayName={selectedCommodity?.displayName ?? ''}
        source={selectedCommodity?.source as 'YAHOO' | 'FRED' | undefined}
      />
    </div>
  );
}
