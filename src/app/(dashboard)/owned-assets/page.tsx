'use client';

import { useEffect, useState } from 'react';
import { useOwnedAssets, type OwnedAsset } from '@/hooks/useOwnedAssets';
import { SignalBadge } from '@/components/dashboard/SignalBadge';
import { SparklineChart, getSparklineColor } from '@/components/dashboard/SparklineChart';
import { StockDetailModal } from '@/components/dashboard/StockDetailModal';
import type { MarketData, SignalResult } from '@/types';
import { cn, formatPercent, formatCurrency, getChangeColor } from '@/lib/utils';
import {
  Plus,
  Search,
  Wallet,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  X,
  Check,
  Calendar,
  DollarSign,
  Hash,
} from 'lucide-react';

interface AssetWithMarketData extends OwnedAsset {
  marketData?: MarketData;
  signal?: SignalResult;
  sparkline?: number[];
  currentValue?: number;
  gainLoss?: number;
  gainLossPercent?: number;
}

export default function OwnedAssetsPage() {
  const { assets, addAsset, updateAsset, removeAsset, totalInvested, isLoaded } = useOwnedAssets();
  const [assetsWithData, setAssetsWithData] = useState<AssetWithMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithMarketData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<OwnedAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; type?: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form state for add/edit modal
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    type: 'stock' as 'stock' | 'etf' | 'index' | 'crypto',
    shares: '',
    avgCost: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Fetch market data for owned assets
  useEffect(() => {
    async function fetchData() {
      if (!isLoaded || assets.length === 0) {
        setAssetsWithData([]);
        setIsLoading(false);
        return;
      }

      try {
        const symbols = [...new Set(assets.map((a) => a.symbol))].join(',');

        const [marketResponse, sparklineResponse, signalsResponse] = await Promise.all([
          fetch(`/api/market-data?symbols=${symbols}`),
          fetch(`/api/sparkline?symbols=${symbols}`),
          fetch(`/api/signals?symbols=${symbols}`),
        ]);

        const marketData = marketResponse.ok ? await marketResponse.json() : {};
        const sparklineData = sparklineResponse.ok ? await sparklineResponse.json() : {};
        const signalsData = signalsResponse.ok ? await signalsResponse.json() : {};

        const enrichedAssets = assets.map((asset) => {
          const market = marketData[asset.symbol];
          const currentValue = market?.price ? asset.shares * market.price : undefined;
          const invested = asset.shares * asset.avgCost;
          const gainLoss = currentValue ? currentValue - invested : undefined;
          const gainLossPercent = gainLoss && invested > 0 ? (gainLoss / invested) * 100 : undefined;

          return {
            ...asset,
            marketData: market,
            signal: signalsData[asset.symbol]?.signal,
            sparkline: sparklineData[asset.symbol] || [],
            currentValue,
            gainLoss,
            gainLossPercent,
          };
        });

        setAssetsWithData(enrichedAssets);
      } catch (error) {
        console.error('Error fetching asset data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isLoaded) {
      fetchData();
      const interval = setInterval(fetchData, 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isLoaded, assets]);

  // Search for stocks
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
          setSearchResults(results.slice(0, 6));
        }
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectFromSearch = (symbol: string, name: string, type?: string) => {
    setFormData((prev) => ({
      ...prev,
      symbol,
      name,
      type: (type === 'etf' ? 'etf' : type === 'index' ? 'index' : 'stock') as 'stock' | 'etf' | 'index' | 'crypto',
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddAsset = () => {
    if (!formData.symbol || !formData.shares || !formData.avgCost) return;

    addAsset(
      formData.symbol,
      formData.name || formData.symbol,
      formData.type,
      parseFloat(formData.shares),
      parseFloat(formData.avgCost),
      formData.purchaseDate,
      formData.notes || undefined
    );

    resetForm();
    setShowAddModal(false);
  };

  const handleUpdateAsset = () => {
    if (!editingAsset || !formData.shares || !formData.avgCost) return;

    updateAsset(editingAsset.id, {
      symbol: formData.symbol,
      name: formData.name,
      type: formData.type,
      shares: parseFloat(formData.shares),
      avgCost: parseFloat(formData.avgCost),
      purchaseDate: formData.purchaseDate,
      notes: formData.notes || undefined,
    });

    resetForm();
    setEditingAsset(null);
  };

  const handleEditClick = (asset: OwnedAsset) => {
    setFormData({
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      shares: asset.shares.toString(),
      avgCost: asset.avgCost.toString(),
      purchaseDate: asset.purchaseDate,
      notes: asset.notes || '',
    });
    setEditingAsset(asset);
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      type: 'stock',
      shares: '',
      avgCost: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  // Calculate portfolio summary
  const totalCurrentValue = assetsWithData.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  const totalGainLoss = totalCurrentValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  const winners = assetsWithData.filter((a) => (a.gainLossPercent ?? 0) > 0).length;
  const losers = assetsWithData.filter((a) => (a.gainLossPercent ?? 0) < 0).length;

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
          <h1 className="text-2xl font-bold text-slate-100">Owned Assets</h1>
          <p className="text-slate-400 mt-1">Track your investment portfolio</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </button>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Invested</p>
              <p className="text-xl font-bold text-slate-100">
                {formatCurrency(totalInvested)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Current Value</p>
              <p className="text-xl font-bold text-slate-100">
                {formatCurrency(totalCurrentValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', totalGainLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10')}>
              {totalGainLoss >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Gain/Loss</p>
              <p className={cn('text-xl font-bold', totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500')}>
                {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
                <span className="text-sm ml-1">
                  ({totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Hash className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Positions</p>
              <p className="text-xl font-bold text-slate-100">
                {assets.length}
                <span className="text-sm text-slate-400 ml-2">
                  ({winners} <span className="text-green-500">↑</span> / {losers} <span className="text-red-500">↓</span>)
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      {assets.length > 0 ? (
        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Asset</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Shares</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Cost</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Value</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Gain/Loss</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">30D Chart</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Signal</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><div className="skeleton h-5 w-20 rounded" /></td>
                    <td className="px-4 py-4 text-right"><div className="skeleton h-5 w-12 rounded ml-auto" /></td>
                    <td className="px-4 py-4 text-right"><div className="skeleton h-5 w-16 rounded ml-auto" /></td>
                    <td className="px-4 py-4 text-right"><div className="skeleton h-5 w-16 rounded ml-auto" /></td>
                    <td className="px-4 py-4 text-right hidden md:table-cell"><div className="skeleton h-5 w-20 rounded ml-auto" /></td>
                    <td className="px-4 py-4 text-right"><div className="skeleton h-5 w-16 rounded ml-auto" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="skeleton h-10 w-24 rounded mx-auto" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="skeleton h-6 w-20 rounded mx-auto" /></td>
                    <td className="px-4 py-4"><div className="skeleton h-8 w-16 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : (
                assetsWithData.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <td className="px-4 py-4">
                      <div
                        className="text-left hover:text-blue-400 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100">{asset.symbol}</span>
                          {asset.type === 'etf' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded">
                              ETF
                            </span>
                          )}
                          {asset.type === 'stock' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded">
                              Stock
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate max-w-[150px]">{asset.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-slate-200">
                      {asset.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-200">
                      {formatCurrency(asset.avgCost)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-slate-200">{formatCurrency(asset.marketData?.price ?? 0)}</span>
                      <div className={cn('text-xs', getChangeColor(asset.marketData?.changePercent ?? 0))}>
                        {formatPercent(asset.marketData?.changePercent ?? 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-slate-200 hidden md:table-cell">
                      {asset.currentValue ? formatCurrency(asset.currentValue) : '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className={cn('font-medium', (asset.gainLoss ?? 0) >= 0 ? 'text-green-500' : 'text-red-500')}>
                        {asset.gainLoss !== undefined ? (
                          <>
                            {asset.gainLoss >= 0 ? '+' : ''}{formatCurrency(asset.gainLoss)}
                            <div className="text-xs">
                              ({asset.gainLossPercent! >= 0 ? '+' : ''}{asset.gainLossPercent?.toFixed(2)}%)
                            </div>
                          </>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="flex justify-center">
                        {asset.sparkline && asset.sparkline.length > 0 ? (
                          <SparklineChart
                            data={asset.sparkline}
                            width={100}
                            height={36}
                            color={getSparklineColor(asset.sparkline)}
                            lineWidth={1.5}
                          />
                        ) : (
                          <span className="text-slate-600 text-xs">No data</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="flex justify-center">
                        {asset.signal ? (
                          <SignalBadge action={asset.signal.action} size="sm" />
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(asset);
                          }}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAsset(asset.id);
                          }}
                          className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900 rounded-lg border border-slate-800">
          <Wallet className="w-16 h-16 text-slate-700 mb-4" />
          <h3 className="text-xl font-semibold text-slate-300">No assets yet</h3>
          <p className="text-slate-500 mt-2 mb-6">Start building your portfolio by adding your first asset</p>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Asset
          </button>
        </div>
      )}

      {/* Stock Detail Modal */}
      <StockDetailModal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        symbol={selectedAsset?.symbol || ''}
        name={selectedAsset?.name || ''}
      />

      {/* Add/Edit Asset Modal */}
      {(showAddModal || editingAsset) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-100">
                {editingAsset ? 'Edit Asset' : 'Add New Asset'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAsset(null);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Symbol Search */}
              {!editingAsset && (
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Symbol</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery || formData.symbol}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setFormData((prev) => ({ ...prev, symbol: e.target.value.toUpperCase() }));
                      }}
                      placeholder="Search for a stock or ETF..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.symbol}
                          onClick={() => handleSelectFromSearch(result.symbol, result.name, result.type)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700 transition-colors text-left"
                        >
                          <div>
                            <span className="font-semibold text-slate-100">{result.symbol}</span>
                            <span className="text-sm text-slate-500 ml-2">{result.name}</span>
                          </div>
                          {result.type === 'etf' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded">
                              ETF
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editingAsset && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Symbol</label>
                  <input
                    type="text"
                    value={formData.symbol}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                  />
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Company name"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Shares and Avg Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Shares</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.shares}
                    onChange={(e) => setFormData((prev) => ({ ...prev, shares: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Avg Cost</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.avgCost}
                      onChange={(e) => setFormData((prev) => ({ ...prev, avgCost: e.target.value }))}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Purchase Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAsset(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingAsset ? handleUpdateAsset : handleAddAsset}
                disabled={!formData.symbol || !formData.shares || !formData.avgCost}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                {editingAsset ? 'Update' : 'Add Asset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
