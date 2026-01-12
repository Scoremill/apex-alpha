'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
}

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (symbol: string, name: string) => void;
  existingSymbols: string[];
}

export function AddStockModal({ isOpen, onClose, onAdd, existingSymbols }: AddStockModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const results = await response.json();
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (!existingSymbols.includes(result.symbol)) {
        onAdd(result.symbol, result.name);
        setSearchQuery('');
        setSearchResults([]);
        onClose();
      }
    },
    [existingSymbols, onAdd, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 rounded-xl border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Add Stock to Dashboard</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by symbol or company name..."
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 max-h-[300px] overflow-y-auto rounded-lg border border-slate-800">
              {searchResults.map((result) => {
                const isExisting = existingSymbols.includes(result.symbol);
                return (
                  <button
                    key={result.symbol}
                    onClick={() => handleSelect(result)}
                    disabled={isExisting}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                      'border-b border-slate-800 last:border-b-0',
                      isExisting
                        ? 'bg-slate-800/50 cursor-not-allowed'
                        : 'hover:bg-slate-800 cursor-pointer'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{result.symbol}</span>
                        {result.type === 'index' && (
                          <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                            Index
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-slate-400 line-clamp-1">{result.name}</span>
                    </div>
                    {isExisting ? (
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <Check className="w-4 h-4" />
                        Added
                      </span>
                    ) : (
                      <span className="text-sm text-blue-500">Add</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {searchQuery && !isSearching && searchResults.length === 0 && !error && (
            <div className="mt-4 text-center py-8 text-slate-500">
              No stocks found for &quot;{searchQuery}&quot;
            </div>
          )}

          {/* Instructions */}
          {!searchQuery && (
            <div className="mt-4 text-center py-8 text-slate-500">
              <p>Search for any stock by symbol or company name</p>
              <p className="text-sm mt-1">Examples: AAPL, Microsoft, NVDA</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddStockModal;
