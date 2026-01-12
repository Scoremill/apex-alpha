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
}

const COMMODITIES = [
  { symbol: 'GC=F', name: 'Gold Futures', displayName: 'Gold', category: 'Precious Metals' },
  { symbol: 'SI=F', name: 'Silver Futures', displayName: 'Silver', category: 'Precious Metals' },
  { symbol: 'PL=F', name: 'Platinum Futures', displayName: 'Platinum', category: 'Precious Metals' },
  { symbol: 'PA=F', name: 'Palladium Futures', displayName: 'Palladium', category: 'Precious Metals' },
  { symbol: 'CL=F', name: 'Crude Oil WTI', displayName: 'Crude Oil', category: 'Energy' },
  { symbol: 'BZ=F', name: 'Brent Crude Oil', displayName: 'Brent', category: 'Energy' },
  { symbol: 'NG=F', name: 'Natural Gas', displayName: 'Natural Gas', category: 'Energy' },
  { symbol: 'HO=F', name: 'Heating Oil', displayName: 'Heating Oil', category: 'Energy' },
  { symbol: 'RB=F', name: 'RBOB Gasoline', displayName: 'Gasoline', category: 'Energy' },
  { symbol: 'ZC=F', name: 'Corn Futures', displayName: 'Corn', category: 'Agriculture' },
  { symbol: 'ZW=F', name: 'Wheat Futures', displayName: 'Wheat', category: 'Agriculture' },
  { symbol: 'ZS=F', name: 'Soybean Futures', displayName: 'Soybeans', category: 'Agriculture' },
  { symbol: 'KC=F', name: 'Coffee Futures', displayName: 'Coffee', category: 'Agriculture' },
  { symbol: 'SB=F', name: 'Sugar Futures', displayName: 'Sugar', category: 'Agriculture' },
  { symbol: 'CC=F', name: 'Cocoa Futures', displayName: 'Cocoa', category: 'Agriculture' },
  { symbol: 'CT=F', name: 'Cotton Futures', displayName: 'Cotton', category: 'Agriculture' },
  { symbol: 'HG=F', name: 'Copper Futures', displayName: 'Copper', category: 'Industrial Metals' },
  { symbol: 'ALI=F', name: 'Aluminum Futures', displayName: 'Aluminum', category: 'Industrial Metals' },
  { symbol: 'LE=F', name: 'Live Cattle', displayName: 'Live Cattle', category: 'Livestock' },
  { symbol: 'HE=F', name: 'Lean Hogs', displayName: 'Lean Hogs', category: 'Livestock' },
  { symbol: 'WOOD', name: 'iShares Global Timber ETF', displayName: 'Lumber', category: 'Homebuilding' },
  { symbol: 'AA', name: 'Alcoa Corp', displayName: 'Aluminum', category: 'Homebuilding' },
  { symbol: 'USO', name: 'US Oil Fund', displayName: 'Oil (Gas)', category: 'Homebuilding' },
  { symbol: 'X', name: 'United States Steel', displayName: 'Steel', category: 'Homebuilding' },
  { symbol: 'CUT', name: 'Invesco MSCI Timber ETF', displayName: 'OSB/Studs', category: 'Homebuilding' },
  { symbol: 'EXP', name: 'Eagle Materials', displayName: 'Gypsum (Drywall)', category: 'Homebuilding' },
  { symbol: 'MLM', name: 'Martin Marietta', displayName: 'Concrete/Aggregates', category: 'Homebuilding' },
  { symbol: 'SHW', name: 'Sherwin-Williams', displayName: 'Resin (Paint)', category: 'Homebuilding' },
  { symbol: 'WY', name: 'Weyerhaeuser', displayName: 'Wood Products', category: 'Homebuilding' },
  { symbol: 'BCC', name: 'Boise Cascade', displayName: 'Plywood/OSB', category: 'Homebuilding' },
];

const CATEGORIES = ['Precious Metals', 'Energy', 'Agriculture', 'Industrial Metals', 'Livestock', 'Homebuilding'];

export default function CommoditiesPage() {
  const [commodities, setCommodities] = useState<(CommodityData & { category: string })[]>(
    COMMODITIES.map((c) => ({ ...c, category: c.category }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCommodity, setSelectedCommodity] = useState<(CommodityData & { category: string }) | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const symbols = COMMODITIES.map((c) => c.symbol).join(',');
        const response = await fetch(`/api/market-data?symbols=${symbols}`);
        
        if (response.ok) {
          const marketData = await response.json();
          
          setCommodities(
            COMMODITIES.map((c) => ({
              ...c,
              price: marketData[c.symbol]?.price,
              change: marketData[c.symbol]?.change,
              changePercent: marketData[c.symbol]?.changePercent,
              high: marketData[c.symbol]?.high,
              low: marketData[c.symbol]?.low,
              volume: marketData[c.symbol]?.volume?.toLocaleString(),
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching commodity data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60 * 1000);
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
      />
    </div>
  );
}
