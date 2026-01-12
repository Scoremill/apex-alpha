'use client';

import { useEffect, useState } from 'react';
import { WatchlistCard } from '@/components/dashboard/WatchlistCard';
import { StockDetailModal } from '@/components/dashboard/StockDetailModal';
import { useWatchlist } from '@/hooks/useWatchlist';
import type { MarketData, SignalResult, SentimentResult } from '@/types';
import { Plus, Search, Star, Trash2, X, Edit2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceData {
  perf1M: number;
  perf3M: number;
  perf6M: number;
}

interface StockData {
  symbol: string;
  name: string;
  type?: 'stock' | 'etf' | 'index' | 'crypto';
  marketData?: MarketData;
  signal?: SignalResult;
  sentiment?: SentimentResult;
  sparkline?: number[];
  performance?: PerformanceData;
}

export default function WatchlistPage() {
  const {
    watchlists,
    activeWatchlist,
    activeWatchlistId,
    setActiveWatchlistId,
    createWatchlist,
    deleteWatchlist,
    renameWatchlist,
    addSymbol,
    removeSymbol,
    getStockInfo,
    isLoaded,
  } = useWatchlist();

  const [stocks, setStocks] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; type?: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [editingWatchlistId, setEditingWatchlistId] = useState<string | null>(null);
  const [editingWatchlistName, setEditingWatchlistName] = useState('');

  // Fetch stock data for current watchlist
  useEffect(() => {
    async function fetchData() {
      if (!activeWatchlist || activeWatchlist.symbols.length === 0) {
        setStocks([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const symbols = activeWatchlist.symbols.join(',');
        const [marketResponse, signalsResponse, sparklineResponse, performanceResponse] = await Promise.all([
          fetch(`/api/market-data?symbols=${symbols}`),
          fetch(`/api/signals?symbols=${symbols}`),
          fetch(`/api/sparkline?symbols=${symbols}`),
          fetch(`/api/performance?symbols=${symbols}`),
        ]);

        const marketData = marketResponse.ok ? await marketResponse.json() : {};
        const signalsData = signalsResponse.ok ? await signalsResponse.json() : {};
        const sparklineData = sparklineResponse.ok ? await sparklineResponse.json() : {};
        const performanceData = performanceResponse.ok ? await performanceResponse.json() : {};

        const stocksWithData = activeWatchlist.symbols.map((symbol) => {
          const info = getStockInfo(symbol);
          return {
            symbol,
            name: info?.name || symbol,
            type: info?.type,
            marketData: marketData[symbol],
            signal: signalsData[symbol]?.signal,
            sentiment: signalsData[symbol]?.sentiment,
            sparkline: sparklineData[symbol] || [],
            performance: performanceData[symbol],
          };
        });

        setStocks(stocksWithData);
      } catch (error) {
        console.error('Error fetching watchlist data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isLoaded) {
      fetchData();
      const interval = setInterval(fetchData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeWatchlist, isLoaded, getStockInfo]);

  // Search for stocks using Yahoo Finance API
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (searchQuery.length < 1) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const results = await response.json();
          setSearchResults(results.slice(0, 8));
        }
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleAddToWatchlist = (symbol: string, name: string, type?: string) => {
    const assetType = type === 'etf' ? 'etf' : type === 'index' ? 'index' : 'stock';
    addSymbol(symbol, name, assetType);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCreateWatchlist = () => {
    if (!newWatchlistName.trim()) return;
    createWatchlist(newWatchlistName);
    setNewWatchlistName('');
    setShowAddModal(false);
  };

  const startEditingWatchlist = (id: string, name: string) => {
    setEditingWatchlistId(id);
    setEditingWatchlistName(name);
  };

  const saveWatchlistName = () => {
    if (!editingWatchlistId || !editingWatchlistName.trim()) return;
    renameWatchlist(editingWatchlistId, editingWatchlistName.trim());
    setEditingWatchlistId(null);
    setEditingWatchlistName('');
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Watchlist</h1>
          <p className="text-slate-400 mt-1">Track your favorite stocks and ETFs</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Watchlist
        </button>
      </div>

      {/* Watchlist Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {watchlists.map((watchlist) => (
          <div
            key={watchlist.id}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              activeWatchlistId === watchlist.id
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            )}
          >
            <button
              onClick={() => setActiveWatchlistId(watchlist.id)}
              className="flex items-center gap-2"
            >
              <Star className={cn('w-4 h-4', activeWatchlistId === watchlist.id && 'fill-yellow-500 text-yellow-500')} />
              {editingWatchlistId === watchlist.id ? (
                <input
                  type="text"
                  value={editingWatchlistName}
                  onChange={(e) => setEditingWatchlistName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveWatchlistName();
                    if (e.key === 'Escape') {
                      setEditingWatchlistId(null);
                      setEditingWatchlistName('');
                    }
                  }}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-sm text-slate-100 w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                watchlist.name
              )}
            </button>
            {activeWatchlistId === watchlist.id && (
              <div className="flex items-center gap-1 ml-2">
                {editingWatchlistId === watchlist.id ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveWatchlistName();
                    }}
                    className="p-1 hover:bg-slate-700 rounded text-green-500"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingWatchlist(watchlist.id, watchlist.name);
                    }}
                    className="p-1 hover:bg-slate-700 rounded"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
                {watchlist.id !== 'default' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWatchlist(watchlist.id);
                    }}
                    className="p-1 hover:bg-red-600 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <span className="text-xs text-slate-500">({watchlist.symbols.length})</span>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stocks or ETFs to add..."
          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-10 overflow-hidden">
            {searchResults.map((result) => (
              <button
                key={result.symbol}
                onClick={() => handleAddToWatchlist(result.symbol, result.name, result.type)}
                disabled={activeWatchlist?.symbols.includes(result.symbol)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors',
                  activeWatchlist?.symbols.includes(result.symbol) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="text-left flex items-center gap-2">
                  <span className="font-semibold text-slate-100">{result.symbol}</span>
                  {result.type === 'etf' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded">
                      ETF
                    </span>
                  )}
                  {result.type === 'stock' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded">
                      Stock
                    </span>
                  )}
                  <span className="text-sm text-slate-500">{result.name}</span>
                </div>
                {activeWatchlist?.symbols.includes(result.symbol) ? (
                  <span className="text-xs text-slate-500">Added</span>
                ) : (
                  <Plus className="w-4 h-4 text-blue-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stock Grid */}
      {stocks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stocks.map((stock) => (
            <div key={stock.symbol} className="relative group">
              <WatchlistCard
                symbol={stock.symbol}
                name={stock.name}
                assetType={stock.type}
                marketData={stock.marketData}
                signal={stock.signal}
                sentiment={stock.sentiment}
                sparklineData={stock.sparkline}
                performance={stock.performance}
                isLoading={isLoading}
                onClick={() => setSelectedStock(stock)}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeSymbol(stock.symbol);
                }}
                className="absolute top-2 right-2 p-2 bg-slate-800/80 hover:bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
              >
                <Trash2 className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Star className="w-12 h-12 text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">No stocks in this watchlist</h3>
          <p className="text-slate-500 mt-1">Use the search bar above to add stocks</p>
        </div>
      )}

      {/* Stock Detail Modal */}
      <StockDetailModal
        isOpen={!!selectedStock}
        onClose={() => setSelectedStock(null)}
        symbol={selectedStock?.symbol || ''}
        name={selectedStock?.name || ''}
      />

      {/* New Watchlist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Create New Watchlist</h3>
            <input
              type="text"
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              placeholder="Watchlist name"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateWatchlist();
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWatchlist}
                disabled={!newWatchlistName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
