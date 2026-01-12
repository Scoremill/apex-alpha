'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { TickerCard } from './TickerCard';
import { StockDetailModal } from './StockDetailModal';
import { AddStockModal } from './AddStockModal';
import { DEFAULT_STOCKS } from '@/lib/chart-img';
import type { MarketData, SignalResult, SentimentResult } from '@/types';

interface StockData {
  symbol: string;
  name: string;
  marketData?: MarketData;
  signal?: SignalResult;
  sentiment?: SentimentResult;
  sparkline?: number[];
}

export function StockGrid() {
  const [stocks, setStocks] = useState<StockData[]>(
    DEFAULT_STOCKS.map((s) => ({
      symbol: s.symbol,
      name: s.name,
    }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch market data, signals, and sparklines in parallel
        const [marketResponse, signalsResponse, sparklineResponse] = await Promise.all([
          fetch('/api/market-data?' + new URLSearchParams({
            symbols: DEFAULT_STOCKS.map((s) => s.symbol).join(','),
          })),
          fetch('/api/signals?' + new URLSearchParams({
            symbols: DEFAULT_STOCKS.map((s) => s.symbol).join(','),
          })),
          fetch('/api/sparkline?' + new URLSearchParams({
            symbols: DEFAULT_STOCKS.map((s) => s.symbol).join(','),
          })),
        ]);

        const marketData = marketResponse.ok ? await marketResponse.json() : {};
        const signalsData = signalsResponse.ok ? await signalsResponse.json() : {};
        const sparklineData = sparklineResponse.ok ? await sparklineResponse.json() : {};

        setStocks((prev) =>
          prev.map((stock) => ({
            ...stock,
            marketData: marketData[stock.symbol],
            signal: signalsData[stock.symbol]?.signal,
            sentiment: signalsData[stock.symbol]?.sentiment,
            sparkline: sparklineData[stock.symbol] || [],
          }))
        );
      } catch (error) {
        console.error('Error fetching stock data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddStock = (symbol: string, name: string) => {
    // Check if stock already exists
    if (stocks.some((s) => s.symbol === symbol)) {
      return;
    }

    // Add the new stock
    setStocks((prev) => [...prev, { symbol, name }]);

    // Fetch data for the new stock
    fetchStockData(symbol);
  };

  const fetchStockData = async (symbol: string) => {
    try {
      const [marketResponse, sparklineResponse] = await Promise.all([
        fetch('/api/market-data?' + new URLSearchParams({ symbols: symbol })),
        fetch('/api/sparkline?' + new URLSearchParams({ symbols: symbol })),
      ]);

      const marketData = marketResponse.ok ? await marketResponse.json() : {};
      const sparklineData = sparklineResponse.ok ? await sparklineResponse.json() : {};

      setStocks((prev) =>
        prev.map((stock) =>
          stock.symbol === symbol
            ? {
                ...stock,
                marketData: marketData[symbol],
                sparkline: sparklineData[symbol] || [],
              }
            : stock
        )
      );
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
    }
  };

  const handleRemoveStock = (symbol: string) => {
    setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100">Stock Signals</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Stock
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stocks.map((stock) => (
          <TickerCard
            key={stock.symbol}
            symbol={stock.symbol}
            name={stock.name}
            marketData={stock.marketData}
            signal={stock.signal}
            sentiment={stock.sentiment}
            sparklineData={stock.sparkline}
            isLoading={isLoading}
            onClick={() => setSelectedStock(stock)}
          />
        ))}
      </div>

      {/* Stock Detail Modal */}
      <StockDetailModal
        isOpen={!!selectedStock}
        onClose={() => setSelectedStock(null)}
        symbol={selectedStock?.symbol || ''}
        name={selectedStock?.name || ''}
      />

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddStock}
        existingSymbols={stocks.map((s) => s.symbol)}
      />
    </section>
  );
}

export default StockGrid;
