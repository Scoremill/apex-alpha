'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  createdAt: string;
  updatedAt: string;
}

interface StockInfo {
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'index' | 'crypto';
}

const DEFAULT_WATCHLIST: Watchlist = {
  id: 'default',
  name: 'My Watchlist',
  symbols: ['AAPL', 'GOOGL', 'MSFT', 'NVDA'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useWatchlist() {
  const [watchlists, setWatchlists] = useLocalStorage<Watchlist[]>('apex-watchlists', [DEFAULT_WATCHLIST]);
  const [stockInfo, setStockInfo] = useLocalStorage<Record<string, StockInfo>>('apex-stock-info', {});
  const [activeWatchlistId, setActiveWatchlistId] = useLocalStorage<string>('apex-active-watchlist', 'default');
  const [isLoaded, setIsLoaded] = useState(false);

  // Ensure default watchlist exists on mount
  useEffect(() => {
    if (watchlists.length === 0) {
      setWatchlists([DEFAULT_WATCHLIST]);
    }
    setIsLoaded(true);
  }, [watchlists.length, setWatchlists]);

  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];

  const createWatchlist = useCallback((name: string): Watchlist => {
    const now = new Date().toISOString();
    const newWatchlist: Watchlist = {
      id: `watchlist-${Date.now()}`,
      name,
      symbols: [],
      createdAt: now,
      updatedAt: now,
    };

    setWatchlists((prev) => [...prev, newWatchlist]);
    setActiveWatchlistId(newWatchlist.id);

    return newWatchlist;
  }, [setWatchlists, setActiveWatchlistId]);

  const deleteWatchlist = useCallback((id: string) => {
    if (id === 'default') return; // Protect default watchlist

    setWatchlists((prev) => prev.filter((w) => w.id !== id));

    if (activeWatchlistId === id) {
      setActiveWatchlistId('default');
    }
  }, [activeWatchlistId, setWatchlists, setActiveWatchlistId]);

  const renameWatchlist = useCallback((id: string, name: string) => {
    setWatchlists((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, name, updatedAt: new Date().toISOString() }
          : w
      )
    );
  }, [setWatchlists]);

  const addSymbol = useCallback((symbol: string, name: string, type: 'stock' | 'etf' | 'index' | 'crypto' = 'stock') => {
    if (!activeWatchlist) return;
    if (activeWatchlist.symbols.includes(symbol)) return;

    // Store stock info
    setStockInfo((prev) => ({
      ...prev,
      [symbol]: { symbol, name, type },
    }));

    // Add to watchlist
    setWatchlists((prev) =>
      prev.map((w) =>
        w.id === activeWatchlistId
          ? {
              ...w,
              symbols: [...w.symbols, symbol],
              updatedAt: new Date().toISOString(),
            }
          : w
      )
    );
  }, [activeWatchlist, activeWatchlistId, setWatchlists, setStockInfo]);

  const removeSymbol = useCallback((symbol: string) => {
    setWatchlists((prev) =>
      prev.map((w) =>
        w.id === activeWatchlistId
          ? {
              ...w,
              symbols: w.symbols.filter((s) => s !== symbol),
              updatedAt: new Date().toISOString(),
            }
          : w
      )
    );
  }, [activeWatchlistId, setWatchlists]);

  const getStockInfo = useCallback((symbol: string): StockInfo | undefined => {
    return stockInfo[symbol];
  }, [stockInfo]);

  return {
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
    stockInfo,
    isLoaded,
  };
}

export default useWatchlist;
