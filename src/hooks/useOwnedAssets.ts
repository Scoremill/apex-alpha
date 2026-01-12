'use client';

import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface OwnedAsset {
  id: string;
  symbol: string;
  name: string;
  type: 'stock' | 'etf' | 'index' | 'crypto';
  shares: number;
  avgCost: number;
  purchaseDate: string;
  notes?: string;
  addedAt: string;
  updatedAt: string;
}

export function useOwnedAssets() {
  const [assets, setAssets] = useLocalStorage<OwnedAsset[]>('apex-owned-assets', []);
  const [isLoaded, setIsLoaded] = useState(false);

  // Mark as loaded after first render
  useState(() => {
    setIsLoaded(true);
  });

  const addAsset = useCallback((
    symbol: string,
    name: string,
    type: 'stock' | 'etf' | 'index' | 'crypto',
    shares: number,
    avgCost: number,
    purchaseDate: string,
    notes?: string
  ): OwnedAsset => {
    const now = new Date().toISOString();
    const newAsset: OwnedAsset = {
      id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      symbol,
      name,
      type,
      shares,
      avgCost,
      purchaseDate,
      notes,
      addedAt: now,
      updatedAt: now,
    };

    setAssets((prev) => [...prev, newAsset]);
    return newAsset;
  }, [setAssets]);

  const updateAsset = useCallback((
    id: string,
    updates: Partial<Omit<OwnedAsset, 'id' | 'addedAt'>>
  ) => {
    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === id
          ? { ...asset, ...updates, updatedAt: new Date().toISOString() }
          : asset
      )
    );
  }, [setAssets]);

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((asset) => asset.id !== id));
  }, [setAssets]);

  const getAsset = useCallback((id: string): OwnedAsset | undefined => {
    return assets.find((asset) => asset.id === id);
  }, [assets]);

  const getAssetsBySymbol = useCallback((symbol: string): OwnedAsset[] => {
    return assets.filter((asset) => asset.symbol === symbol);
  }, [assets]);

  // Calculate totals
  const totalInvested = assets.reduce((sum, asset) => sum + asset.shares * asset.avgCost, 0);
  const uniqueSymbols = [...new Set(assets.map((a) => a.symbol))];

  return {
    assets,
    addAsset,
    updateAsset,
    removeAsset,
    getAsset,
    getAssetsBySymbol,
    totalInvested,
    uniqueSymbols,
    isLoaded: true,
  };
}

export default useOwnedAssets;
