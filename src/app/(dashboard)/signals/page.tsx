'use client';

import { useEffect, useState } from 'react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { SignalBadge } from '@/components/dashboard/SignalBadge';
import { SparklineChart, getSparklineColor } from '@/components/dashboard/SparklineChart';
import { StockDetailModal } from '@/components/dashboard/StockDetailModal';
import type { MarketData, SignalResult, SentimentResult } from '@/types';
import { cn, formatPercent, formatCurrency, getChangeColor } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Filter, TrendingUp, TrendingDown, Minus, Clock, Star } from 'lucide-react';

interface CachedSentiment {
  score: number;
  label: 'Bullish' | 'Bearish' | 'Neutral';
  rationale: string;
  analyzedAt?: string | null;
  headlinesCount?: number;
  cachedAt?: string;
}

interface StockSignal {
  symbol: string;
  name: string;
  type?: 'stock' | 'etf' | 'index' | 'crypto';
  marketData?: MarketData;
  signal?: SignalResult;
  sentiment?: SentimentResult | CachedSentiment;
  sparkline?: number[];
}

type FilterType = 'all' | 'buy' | 'hold' | 'sell';

// LocalStorage key for sentiment cache (shared with modal)
const SENTIMENT_CACHE_KEY = 'apex_sentiment_cache';

function loadAllCachedSentiments(): Record<string, CachedSentiment> {
  if (typeof window === 'undefined') return {};
  try {
    const cache = localStorage.getItem(SENTIMENT_CACHE_KEY);
    return cache ? JSON.parse(cache) : {};
  } catch {
    return {};
  }
}

// Calculate signal based on sentiment and market data
function calculateSignal(
  sentiment: CachedSentiment | undefined,
  marketData: MarketData | undefined,
  sparkline: number[] | undefined
): SignalResult {
  let score = 50; // Base neutral score
  const rationale: string[] = [];

  // Factor 1: Sentiment (40% weight)
  if (sentiment) {
    if (sentiment.label === 'Bullish') {
      score += 20 * (1 + sentiment.score);
      rationale.push(`Bullish sentiment (${(sentiment.score * 100).toFixed(0)}%)`);
    } else if (sentiment.label === 'Bearish') {
      score -= 20 * (1 - sentiment.score);
      rationale.push(`Bearish sentiment (${(sentiment.score * 100).toFixed(0)}%)`);
    } else {
      rationale.push('Neutral sentiment');
    }
  }

  // Factor 2: Price momentum (30% weight)
  if (marketData?.changePercent !== undefined) {
    const change = marketData.changePercent;
    if (change > 2) {
      score += 15;
      rationale.push('Strong upward momentum');
    } else if (change > 0) {
      score += 8;
      rationale.push('Positive momentum');
    } else if (change < -2) {
      score -= 15;
      rationale.push('Strong downward pressure');
    } else if (change < 0) {
      score -= 8;
      rationale.push('Negative momentum');
    }
  }

  // Factor 3: Trend from sparkline (30% weight)
  if (sparkline && sparkline.length >= 5) {
    const recent = sparkline.slice(-5);
    const older = sparkline.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

    if (recentAvg > olderAvg * 1.02) {
      score += 10;
      rationale.push('Upward price trend');
    } else if (recentAvg < olderAvg * 0.98) {
      score -= 10;
      rationale.push('Downward price trend');
    }
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine action based on score
  let action: SignalResult['action'];
  if (score >= 75) {
    action = 'STRONG_BUY';
  } else if (score >= 60) {
    action = 'ACCUMULATE';
  } else if (score <= 25) {
    action = 'EXIT';
  } else {
    action = 'HOLD';
  }

  return {
    action,
    confidence: Math.round(score),
    rationale,
  };
}

export default function SignalsPage() {
  const { watchlists, getStockInfo, isLoaded } = useWatchlist();
  const [stocks, setStocks] = useState<StockSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'signal' | 'change' | 'confidence'>('signal');
  const [selectedStock, setSelectedStock] = useState<StockSignal | null>(null);

  // Get all unique symbols from all watchlists
  const allWatchlistSymbols = Array.from(
    new Set(watchlists.flatMap((w) => w.symbols))
  );

  useEffect(() => {
    async function fetchData() {
      if (!isLoaded || allWatchlistSymbols.length === 0) {
        setStocks([]);
        setIsLoading(false);
        return;
      }

      try {
        const symbols = allWatchlistSymbols.join(',');

        // Fetch market data and sparklines (we'll use cached sentiment from localStorage)
        const [marketResponse, sparklineResponse] = await Promise.all([
          fetch(`/api/market-data?symbols=${symbols}`),
          fetch(`/api/sparkline?symbols=${symbols}`),
        ]);

        const marketData = marketResponse.ok ? await marketResponse.json() : {};
        const sparklineData = sparklineResponse.ok ? await sparklineResponse.json() : {};

        // Load cached sentiments from localStorage (same source as modal)
        const cachedSentiments = loadAllCachedSentiments();

        const stocksWithData = allWatchlistSymbols.map((symbol) => {
          const info = getStockInfo(symbol);
          const upperSymbol = symbol.toUpperCase();
          const sentiment = cachedSentiments[upperSymbol];
          const market = marketData[symbol];
          const sparkline = sparklineData[symbol] || [];

          // Calculate signal based on available data
          const signal = calculateSignal(sentiment, market, sparkline);

          return {
            symbol,
            name: info?.name || symbol,
            type: info?.type,
            marketData: market,
            signal,
            sentiment,
            sparkline,
          };
        });

        setStocks(stocksWithData);
      } catch (error) {
        console.error('Error fetching signals:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isLoaded) {
      fetchData();
      const interval = setInterval(fetchData, 5 * 60 * 1000);

      // Also listen for localStorage changes (when sentiment is refreshed in modal)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === SENTIMENT_CACHE_KEY) {
          fetchData();
        }
      };
      window.addEventListener('storage', handleStorageChange);

      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [isLoaded, allWatchlistSymbols.join(',')]);

  // Filter stocks based on signal type
  const filteredStocks = stocks.filter((stock) => {
    if (filter === 'all') return true;
    const action = stock.signal?.action || 'HOLD';
    if (filter === 'buy') return action === 'STRONG_BUY' || action === 'ACCUMULATE';
    if (filter === 'sell') return action === 'EXIT';
    if (filter === 'hold') return action === 'HOLD';
    return true;
  });

  // Sort stocks
  const sortedStocks = [...filteredStocks].sort((a, b) => {
    if (sortBy === 'signal') {
      const signalOrder = { STRONG_BUY: 0, ACCUMULATE: 1, HOLD: 2, EXIT: 3 };
      const aOrder = signalOrder[a.signal?.action || 'HOLD'] ?? 2;
      const bOrder = signalOrder[b.signal?.action || 'HOLD'] ?? 2;
      return aOrder - bOrder;
    }
    if (sortBy === 'change') {
      return (b.marketData?.changePercent ?? 0) - (a.marketData?.changePercent ?? 0);
    }
    if (sortBy === 'confidence') {
      return (b.signal?.confidence ?? 0) - (a.signal?.confidence ?? 0);
    }
    return 0;
  });

  // Calculate signal summary
  const signalCounts = {
    buy: stocks.filter((s) => s.signal?.action === 'STRONG_BUY' || s.signal?.action === 'ACCUMULATE').length,
    hold: stocks.filter((s) => s.signal?.action === 'HOLD' || !s.signal).length,
    sell: stocks.filter((s) => s.signal?.action === 'EXIT').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Signals</h1>
        <p className="text-slate-400 mt-1">AI-powered trading signals for your watchlist stocks and ETFs</p>
      </div>

      {/* Signal Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter(filter === 'buy' ? 'all' : 'buy')}
          className={cn(
            'bg-slate-900 rounded-lg border p-4 text-left transition-all',
            filter === 'buy' ? 'border-green-500 ring-1 ring-green-500' : 'border-slate-800 hover:border-slate-700'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Buy Signals</p>
              <p className="text-2xl font-bold text-green-500">{signalCounts.buy}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter(filter === 'hold' ? 'all' : 'hold')}
          className={cn(
            'bg-slate-900 rounded-lg border p-4 text-left transition-all',
            filter === 'hold' ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-slate-800 hover:border-slate-700'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Minus className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Hold Signals</p>
              <p className="text-2xl font-bold text-yellow-500">{signalCounts.hold}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter(filter === 'sell' ? 'all' : 'sell')}
          className={cn(
            'bg-slate-900 rounded-lg border p-4 text-left transition-all',
            filter === 'sell' ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-800 hover:border-slate-700'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Sell Signals</p>
              <p className="text-2xl font-bold text-red-500">{signalCounts.sell}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Filters and Sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-400">
            Showing {filteredStocks.length} of {stocks.length} stocks
          </span>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-xs text-blue-500 hover:text-blue-400 ml-2"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="signal">Signal Type</option>
            <option value="change">% Change</option>
            <option value="confidence">Confidence</option>
          </select>
        </div>
      </div>

      {/* Signals Table */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Symbol</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Change</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">30D Chart</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Sentiment</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Signal</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-4"><div className="skeleton h-5 w-16 rounded" /></td>
                  <td className="px-4 py-4"><div className="skeleton h-5 w-20 rounded" /></td>
                  <td className="px-4 py-4"><div className="skeleton h-5 w-16 rounded" /></td>
                  <td className="px-4 py-4 hidden md:table-cell"><div className="skeleton h-10 w-32 rounded" /></td>
                  <td className="px-4 py-4"><div className="skeleton h-5 w-16 rounded" /></td>
                  <td className="px-4 py-4"><div className="skeleton h-6 w-24 rounded" /></td>
                  <td className="px-4 py-4 hidden lg:table-cell"><div className="skeleton h-5 w-12 rounded" /></td>
                </tr>
              ))
            ) : sortedStocks.length > 0 ? (
              sortedStocks.map((stock) => (
                <tr
                  key={stock.symbol}
                  className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedStock(stock)}
                >
                  <td className="px-4 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{stock.symbol}</span>
                        {stock.type === 'etf' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded">
                            ETF
                          </span>
                        )}
                        {stock.type === 'stock' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded">
                            Stock
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-[120px]">{stock.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-medium text-slate-200">
                      {formatCurrency(stock.marketData?.price ?? 0)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className={cn('flex items-center gap-1', getChangeColor(stock.marketData?.changePercent ?? 0))}>
                      {(stock.marketData?.changePercent ?? 0) >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {formatPercent(stock.marketData?.changePercent ?? 0)}
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    {stock.sparkline && stock.sparkline.length > 0 ? (
                      <SparklineChart
                        data={stock.sparkline}
                        width={120}
                        height={40}
                        color={getSparklineColor(stock.sparkline)}
                        lineWidth={1.5}
                      />
                    ) : (
                      <span className="text-slate-600 text-xs">No data</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {stock.sentiment ? (
                      <div>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            stock.sentiment.label === 'Bullish' && 'text-green-500',
                            stock.sentiment.label === 'Bearish' && 'text-red-500',
                            stock.sentiment.label === 'Neutral' && 'text-slate-400'
                          )}
                        >
                          {stock.sentiment.label}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">
                          ({stock.sentiment.score > 0 ? '+' : ''}{(stock.sentiment.score * 100).toFixed(0)}%)
                        </span>
                        {'analyzedAt' in stock.sentiment && stock.sentiment.analyzedAt && (
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(stock.sentiment.analyzedAt)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">Not analyzed</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {stock.signal ? (
                      <SignalBadge action={stock.signal.action} size="sm" />
                    ) : (
                      <SignalBadge action="HOLD" size="sm" />
                    )}
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    {stock.signal ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-700 rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full',
                              stock.signal.confidence >= 70 ? 'bg-green-500' :
                              stock.signal.confidence >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${stock.signal.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-400">{stock.signal.confidence}%</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">--</span>
                    )}
                  </td>
                </tr>
              ))
            ) : stocks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Star className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-300">No stocks in your watchlists</h3>
                  <p className="text-slate-500 mt-1">Add stocks to your watchlists to see signals here</p>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No signals match the current filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Signal Legend */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Signal Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <SignalBadge action="STRONG_BUY" size="sm" />
            <span className="text-slate-400">Strong bullish signal</span>
          </div>
          <div className="flex items-center gap-2">
            <SignalBadge action="ACCUMULATE" size="sm" />
            <span className="text-slate-400">Moderate buy signal</span>
          </div>
          <div className="flex items-center gap-2">
            <SignalBadge action="HOLD" size="sm" />
            <span className="text-slate-400">Neutral / wait</span>
          </div>
          <div className="flex items-center gap-2">
            <SignalBadge action="EXIT" size="sm" />
            <span className="text-slate-400">Consider selling</span>
          </div>
        </div>
      </div>

      {/* Stock Detail Modal */}
      <StockDetailModal
        isOpen={!!selectedStock}
        onClose={() => setSelectedStock(null)}
        symbol={selectedStock?.symbol || ''}
        name={selectedStock?.name || ''}
      />
    </div>
  );
}

// Format relative time for sentiment timestamp
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
