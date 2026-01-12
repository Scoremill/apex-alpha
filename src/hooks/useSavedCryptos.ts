'use client';

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface SavedCrypto {
  symbol: string;
  name: string;
  displayName: string;
  addedAt: string;
  owned?: boolean;
}

export function useSavedCryptos() {
  const [savedCryptos, setSavedCryptos] = useLocalStorage<SavedCrypto[]>('apex-saved-cryptos', []);

  const addCrypto = useCallback((symbol: string, name: string, displayName?: string) => {
    if (savedCryptos.some((c) => c.symbol === symbol)) return;

    setSavedCryptos((prev) => [
      ...prev,
      {
        symbol,
        name,
        displayName: displayName || name.replace(' USD', ''),
        addedAt: new Date().toISOString(),
      },
    ]);
  }, [savedCryptos, setSavedCryptos]);

  const removeCrypto = useCallback((symbol: string) => {
    setSavedCryptos((prev) => prev.filter((c) => c.symbol !== symbol));
  }, [setSavedCryptos]);

  const isSaved = useCallback((symbol: string) => {
    return savedCryptos.some((c) => c.symbol === symbol);
  }, [savedCryptos]);

  const isOwned = useCallback((symbol: string) => {
    return savedCryptos.some((c) => c.symbol === symbol && c.owned === true);
  }, [savedCryptos]);

  const toggleOwned = useCallback((symbol: string, name: string, displayName?: string) => {
    const existing = savedCryptos.find((c) => c.symbol === symbol);

    if (existing) {
      // Toggle owned status
      if (existing.owned) {
        // If currently owned, remove from list entirely
        setSavedCryptos((prev) => prev.filter((c) => c.symbol !== symbol));
      } else {
        // Mark as owned
        setSavedCryptos((prev) =>
          prev.map((c) => (c.symbol === symbol ? { ...c, owned: true } : c))
        );
      }
    } else {
      // Add as owned
      setSavedCryptos((prev) => [
        ...prev,
        {
          symbol,
          name,
          displayName: displayName || name.replace(' USD', ''),
          addedAt: new Date().toISOString(),
          owned: true,
        },
      ]);
    }
  }, [savedCryptos, setSavedCryptos]);

  return {
    savedCryptos,
    addCrypto,
    removeCrypto,
    isSaved,
    isOwned,
    toggleOwned,
  };
}

export default useSavedCryptos;
