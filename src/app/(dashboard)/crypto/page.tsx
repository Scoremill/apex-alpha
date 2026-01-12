'use client';

import { useEffect, useState } from 'react';
import { MarketCard } from '@/components/dashboard/MarketCard';
import { StockDetailModal } from '@/components/dashboard/StockDetailModal';
import { useSavedCryptos } from '@/hooks/useSavedCryptos';
import { Search, TrendingUp, TrendingDown, Coins, Plus, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketData } from '@/types';

interface CryptoData {
  symbol: string;
  name: string;
  displayName: string;
  data?: MarketData;
  sparkline?: number[];
}

// Top 10 cryptocurrencies by market cap
const TOP_CRYPTOS = [
  { symbol: 'BTC-USD', name: 'Bitcoin USD', displayName: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum USD', displayName: 'Ethereum' },
  { symbol: 'USDT-USD', name: 'Tether USD', displayName: 'Tether' },
  { symbol: 'BNB-USD', name: 'BNB USD', displayName: 'BNB' },
  { symbol: 'SOL-USD', name: 'Solana USD', displayName: 'Solana' },
  { symbol: 'XRP-USD', name: 'XRP USD', displayName: 'XRP' },
  { symbol: 'USDC-USD', name: 'USD Coin USD', displayName: 'USD Coin' },
  { symbol: 'ADA-USD', name: 'Cardano USD', displayName: 'Cardano' },
  { symbol: 'AVAX-USD', name: 'Avalanche USD', displayName: 'Avalanche' },
  { symbol: 'DOGE-USD', name: 'Dogecoin USD', displayName: 'Dogecoin' },
];

export default function CryptoPage() {
  const { savedCryptos, addCrypto, removeCrypto, isOwned, toggleOwned } = useSavedCryptos();

  const [cryptos, setCryptos] = useState<CryptoData[]>(
    TOP_CRYPTOS.map((c) => ({
      symbol: c.symbol,
      name: c.name,
      displayName: c.displayName,
    }))
  );
  const [savedCryptosData, setSavedCryptosData] = useState<CryptoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize saved cryptos data from persisted storage
  useEffect(() => {
    setSavedCryptosData(
      savedCryptos.map((c) => ({
        symbol: c.symbol,
        name: c.name,
        displayName: c.displayName,
      }))
    );
  }, [savedCryptos]);

  // Fetch market data
  useEffect(() => {
    async function fetchData() {
      try {
        const allSymbols = [
          ...TOP_CRYPTOS.map((c) => c.symbol),
          ...savedCryptos.map((c) => c.symbol),
        ];

        if (allSymbols.length === 0) {
          setIsLoading(false);
          return;
        }

        const [marketResponse, sparklineResponse] = await Promise.all([
          fetch('/api/market-data?' + new URLSearchParams({
            symbols: allSymbols.join(','),
          })),
          fetch('/api/sparkline?' + new URLSearchParams({
            symbols: allSymbols.join(','),
          })),
        ]);

        const marketData = marketResponse.ok ? await marketResponse.json() : {};
        const sparklineData = sparklineResponse.ok ? await sparklineResponse.json() : {};

        setCryptos((prev) =>
          prev.map((c) => ({
            ...c,
            data: marketData[c.symbol],
            sparkline: sparklineData[c.symbol] || [],
          }))
        );

        setSavedCryptosData((prev) =>
          prev.map((c) => ({
            ...c,
            data: marketData[c.symbol],
            sparkline: sparklineData[c.symbol] || [],
          }))
        );
      } catch (error) {
        console.error('Error fetching crypto data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60 * 1000); // Update every minute
    return () => clearInterval(interval);
  }, [savedCryptos]);

  // Search for cryptos
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (searchQuery.length < 1) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/crypto-search?q=${encodeURIComponent(searchQuery)}`);
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

  const handleAddCrypto = (symbol: string, name: string) => {
    if (savedCryptos.some((c) => c.symbol === symbol)) return;
    if (TOP_CRYPTOS.some((c) => c.symbol === symbol)) return;

    addCrypto(symbol, name, name.replace(' USD', ''));
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveCrypto = (symbol: string) => {
    removeCrypto(symbol);
  };

  // Calculate stats
  const gainers = cryptos.filter((c) => (c.data?.changePercent ?? 0) > 0).length;
  const losers = cryptos.filter((c) => (c.data?.changePercent ?? 0) < 0).length;
  const btcPrice = cryptos.find((c) => c.symbol === 'BTC-USD')?.data?.price ?? 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Cryptocurrency</h1>
        <p className="text-slate-400 mt-1">Track top cryptocurrencies and add your favorites</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Coins className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Bitcoin Price</p>
              <p className="text-xl font-bold text-orange-500">
                ${btcPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Gainers (24h)</p>
              <p className="text-xl font-bold text-green-500">{gainers}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Losers (24h)</p>
              <p className="text-xl font-bold text-red-500">{losers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cryptocurrencies to add..."
          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-10 overflow-hidden">
            {searchResults.map((result) => {
              const isInList = savedCryptos.some((c) => c.symbol === result.symbol) ||
                TOP_CRYPTOS.some((c) => c.symbol === result.symbol);
              return (
                <button
                  key={result.symbol}
                  onClick={() => handleAddCrypto(result.symbol, result.name)}
                  disabled={isInList}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors',
                    isInList && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="text-left">
                    <span className="font-semibold text-slate-100">{result.symbol}</span>
                    <span className="text-sm text-slate-500 ml-2">{result.name}</span>
                  </div>
                  {isInList ? (
                    <span className="text-xs text-slate-500">In List</span>
                  ) : (
                    <Plus className="w-4 h-4 text-blue-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* My Cryptocurrencies - Shows ALL saved cryptos (searched + owned from Top 10) */}
      {savedCryptosData.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">My Cryptocurrencies</h2>
          <p className="text-sm text-slate-500 mb-4">Your saved coins and owned coins from Top 10</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {savedCryptosData.map((crypto) => {
              const savedEntry = savedCryptos.find((s) => s.symbol === crypto.symbol);
              const isFromTop10 = TOP_CRYPTOS.some((t) => t.symbol === crypto.symbol);
              const owned = savedEntry?.owned === true;

              return (
                <div key={crypto.symbol} className="relative group">
                  <MarketCard
                    symbol={crypto.symbol}
                    name={crypto.displayName}
                    price={crypto.data?.price}
                    changePercent={crypto.data?.changePercent}
                    sparklineData={crypto.sparkline}
                    isLoading={isLoading}
                    onClick={() => setSelectedCrypto(crypto)}
                    timeframe="30D"
                    isCrypto
                  />
                  {/* Owned indicator for Top 10 coins marked as owned */}
                  {owned && isFromTop10 && (
                    <div className="absolute top-2 left-2 p-1.5 bg-green-600 rounded-lg z-10">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isFromTop10 && owned) {
                        // For Top 10 coins marked as owned, toggle removes ownership
                        toggleOwned(crypto.symbol, crypto.name, crypto.displayName);
                      } else {
                        // For searched/added coins, remove entirely
                        handleRemoveCrypto(crypto.symbol);
                      }
                    }}
                    className="absolute top-2 right-2 p-2 bg-slate-800/80 hover:bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Remove"
                  >
                    <X className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top 10 Cryptocurrencies */}
      <section>
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Top 10 Cryptocurrencies</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cryptos.map((crypto) => {
            const owned = isOwned(crypto.symbol);
            return (
              <div key={crypto.symbol} className="relative group">
                <MarketCard
                  symbol={crypto.symbol}
                  name={crypto.displayName}
                  price={crypto.data?.price}
                  changePercent={crypto.data?.changePercent}
                  sparklineData={crypto.sparkline}
                  isLoading={isLoading}
                  onClick={() => setSelectedCrypto(crypto)}
                  timeframe="30D"
                  isCrypto
                />
                {/* Ownership toggle button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOwned(crypto.symbol, crypto.name, crypto.displayName);
                  }}
                  className={cn(
                    'absolute top-2 right-2 p-2 rounded-lg transition-all z-10',
                    owned
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-slate-800/80 hover:bg-green-600 opacity-0 group-hover:opacity-100'
                  )}
                  title={owned ? 'Remove from owned' : 'Mark as owned'}
                >
                  <Check className={cn('w-4 h-4', owned ? 'text-white' : 'text-slate-300')} />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Crypto Detail Modal */}
      <StockDetailModal
        isOpen={!!selectedCrypto}
        onClose={() => setSelectedCrypto(null)}
        symbol={selectedCrypto?.symbol || ''}
        name={selectedCrypto?.name || ''}
      />
    </div>
  );
}
