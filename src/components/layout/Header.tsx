'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, User, Menu, TrendingUp, X, Loader2, TrendingDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useNotifications, type Notification } from '@/contexts/NotificationContext';

interface HeaderProps {
  onMenuClick?: () => void;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: 'stock' | 'index' | 'etf';
  price?: number;
  changePercent?: number;
}

// Pre-defined searchable items - expanded list
const SEARCHABLE_ITEMS: SearchResult[] = [
  // Popular Tech Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', type: 'stock' },
  { symbol: 'META', name: 'Meta Platforms, Inc.', type: 'stock' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'stock' },
  { symbol: 'NFLX', name: 'Netflix, Inc.', type: 'stock' },
  { symbol: 'PLTR', name: 'Palantir Technologies', type: 'stock' },
  { symbol: 'CRM', name: 'Salesforce, Inc.', type: 'stock' },
  { symbol: 'ORCL', name: 'Oracle Corporation', type: 'stock' },
  { symbol: 'CSCO', name: 'Cisco Systems', type: 'stock' },
  { symbol: 'IBM', name: 'IBM Corporation', type: 'stock' },
  { symbol: 'INTC', name: 'Intel Corporation', type: 'stock' },
  { symbol: 'QCOM', name: 'Qualcomm Inc.', type: 'stock' },
  { symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock' },
  { symbol: 'NOW', name: 'ServiceNow, Inc.', type: 'stock' },
  { symbol: 'SNOW', name: 'Snowflake Inc.', type: 'stock' },
  { symbol: 'PANW', name: 'Palo Alto Networks', type: 'stock' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', type: 'stock' },
  { symbol: 'ZS', name: 'Zscaler, Inc.', type: 'stock' },
  { symbol: 'DDOG', name: 'Datadog, Inc.', type: 'stock' },
  { symbol: 'MDB', name: 'MongoDB, Inc.', type: 'stock' },
  { symbol: 'NET', name: 'Cloudflare, Inc.', type: 'stock' },
  { symbol: 'SHOP', name: 'Shopify Inc.', type: 'stock' },
  { symbol: 'SQ', name: 'Block, Inc.', type: 'stock' },
  { symbol: 'PYPL', name: 'PayPal Holdings', type: 'stock' },
  { symbol: 'COIN', name: 'Coinbase Global', type: 'stock' },
  { symbol: 'ROKU', name: 'Roku, Inc.', type: 'stock' },
  { symbol: 'UBER', name: 'Uber Technologies', type: 'stock' },
  { symbol: 'LYFT', name: 'Lyft, Inc.', type: 'stock' },
  { symbol: 'ABNB', name: 'Airbnb, Inc.', type: 'stock' },
  { symbol: 'DASH', name: 'DoorDash, Inc.', type: 'stock' },
  // Homebuilders & Real Estate
  { symbol: 'LEN', name: 'Lennar Corporation', type: 'stock' },
  { symbol: 'DHI', name: 'D.R. Horton, Inc.', type: 'stock' },
  { symbol: 'PHM', name: 'PulteGroup, Inc.', type: 'stock' },
  { symbol: 'TOL', name: 'Toll Brothers, Inc.', type: 'stock' },
  { symbol: 'KBH', name: 'KB Home', type: 'stock' },
  { symbol: 'NVR', name: 'NVR, Inc.', type: 'stock' },
  // Financial
  { symbol: 'JPM', name: 'JPMorgan Chase', type: 'stock' },
  { symbol: 'BAC', name: 'Bank of America', type: 'stock' },
  { symbol: 'WFC', name: 'Wells Fargo', type: 'stock' },
  { symbol: 'GS', name: 'Goldman Sachs', type: 'stock' },
  { symbol: 'MS', name: 'Morgan Stanley', type: 'stock' },
  { symbol: 'V', name: 'Visa Inc.', type: 'stock' },
  { symbol: 'MA', name: 'Mastercard Inc.', type: 'stock' },
  { symbol: 'AXP', name: 'American Express', type: 'stock' },
  { symbol: 'BLK', name: 'BlackRock, Inc.', type: 'stock' },
  { symbol: 'SCHW', name: 'Charles Schwab', type: 'stock' },
  // Consumer
  { symbol: 'WMT', name: 'Walmart Inc.', type: 'stock' },
  { symbol: 'COST', name: 'Costco Wholesale', type: 'stock' },
  { symbol: 'TGT', name: 'Target Corporation', type: 'stock' },
  { symbol: 'HD', name: 'Home Depot', type: 'stock' },
  { symbol: 'LOW', name: "Lowe's Companies", type: 'stock' },
  { symbol: 'NKE', name: 'Nike, Inc.', type: 'stock' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', type: 'stock' },
  { symbol: 'MCD', name: "McDonald's Corporation", type: 'stock' },
  { symbol: 'DIS', name: 'The Walt Disney Company', type: 'stock' },
  { symbol: 'KO', name: 'Coca-Cola Company', type: 'stock' },
  { symbol: 'PEP', name: 'PepsiCo, Inc.', type: 'stock' },
  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'stock' },
  { symbol: 'UNH', name: 'UnitedHealth Group', type: 'stock' },
  { symbol: 'PFE', name: 'Pfizer Inc.', type: 'stock' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', type: 'stock' },
  { symbol: 'MRK', name: 'Merck & Co.', type: 'stock' },
  { symbol: 'LLY', name: 'Eli Lilly', type: 'stock' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific', type: 'stock' },
  { symbol: 'ABT', name: 'Abbott Laboratories', type: 'stock' },
  // Industrial & Defense
  { symbol: 'BA', name: 'Boeing Company', type: 'stock' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', type: 'stock' },
  { symbol: 'GE', name: 'General Electric', type: 'stock' },
  { symbol: 'HON', name: 'Honeywell International', type: 'stock' },
  { symbol: 'LMT', name: 'Lockheed Martin', type: 'stock' },
  { symbol: 'RTX', name: 'RTX Corporation', type: 'stock' },
  { symbol: 'DE', name: 'Deere & Company', type: 'stock' },
  { symbol: 'UPS', name: 'United Parcel Service', type: 'stock' },
  { symbol: 'FDX', name: 'FedEx Corporation', type: 'stock' },
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil', type: 'stock' },
  { symbol: 'CVX', name: 'Chevron Corporation', type: 'stock' },
  { symbol: 'COP', name: 'ConocoPhillips', type: 'stock' },
  { symbol: 'SLB', name: 'Schlumberger Limited', type: 'stock' },
  { symbol: 'EOG', name: 'EOG Resources', type: 'stock' },
  // Consumer Goods
  { symbol: 'PG', name: 'Procter & Gamble', type: 'stock' },
  { symbol: 'CL', name: 'Colgate-Palmolive', type: 'stock' },
  { symbol: 'EL', name: 'Estée Lauder', type: 'stock' },
  // Telecom
  { symbol: 'T', name: 'AT&T Inc.', type: 'stock' },
  { symbol: 'VZ', name: 'Verizon Communications', type: 'stock' },
  { symbol: 'TMUS', name: 'T-Mobile US', type: 'stock' },
  // Meme & Popular Stocks
  { symbol: 'GME', name: 'GameStop Corp.', type: 'stock' },
  { symbol: 'AMC', name: 'AMC Entertainment', type: 'stock' },
  { symbol: 'BB', name: 'BlackBerry Limited', type: 'stock' },
  { symbol: 'RIVN', name: 'Rivian Automotive', type: 'stock' },
  { symbol: 'LCID', name: 'Lucid Group', type: 'stock' },
  { symbol: 'NIO', name: 'NIO Inc.', type: 'stock' },
  { symbol: 'SOFI', name: 'SoFi Technologies', type: 'stock' },
  { symbol: 'HOOD', name: 'Robinhood Markets', type: 'stock' },
  // Indices
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', type: 'index' },
  { symbol: '^GSPC', name: 'S&P 500', type: 'index' },
  { symbol: '^IXIC', name: 'NASDAQ Composite', type: 'index' },
  { symbol: '^RUT', name: 'Russell 2000', type: 'index' },
  { symbol: '^VIX', name: 'Volatility Index (VIX)', type: 'index' },
  // ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'etf' },
  { symbol: 'DIA', name: 'SPDR Dow Jones ETF', type: 'etf' },
  { symbol: 'GLD', name: 'SPDR Gold Trust', type: 'etf' },
  { symbol: 'SLV', name: 'iShares Silver Trust', type: 'etf' },
  { symbol: 'USO', name: 'United States Oil Fund', type: 'etf' },
  { symbol: 'XLK', name: 'Technology Select Sector', type: 'etf' },
  { symbol: 'XLF', name: 'Financial Select Sector', type: 'etf' },
  { symbol: 'XLE', name: 'Energy Select Sector', type: 'etf' },
  { symbol: 'XLV', name: 'Healthcare Select Sector', type: 'etf' },
  { symbol: 'XLI', name: 'Industrial Select Sector', type: 'etf' },
  { symbol: 'XLY', name: 'Consumer Discretionary', type: 'etf' },
  { symbol: 'XLP', name: 'Consumer Staples', type: 'etf' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', type: 'etf' },
  { symbol: 'ARKG', name: 'ARK Genomic Revolution', type: 'etf' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market', type: 'etf' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'etf' },
];

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'signal': return TrendingUp;
      case 'price': return TrendingDown;
      case 'news': return AlertTriangle;
      case 'system': return CheckCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'signal': return 'bg-green-500/20 text-green-400';
      case 'price': return 'bg-blue-500/20 text-blue-400';
      case 'news': return 'bg-yellow-500/20 text-yellow-400';
      case 'system': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  // Search logic with debounce - uses Yahoo Finance API for all stocks
  useEffect(() => {
    // Clear results when query is empty using a timeout to avoid sync setState
    if (searchQuery.length < 1) {
      const clearTimer = setTimeout(() => {
        setSearchResults([]);
        setShowResults(false);
      }, 0);
      return () => clearTimeout(clearTimer);
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // First check local cache for common symbols
        const query = searchQuery.toLowerCase();
        const localResults = SEARCHABLE_ITEMS.filter(
          (item) =>
            item.symbol.toLowerCase().includes(query) ||
            item.name.toLowerCase().includes(query)
        ).slice(0, 4);

        // If we have good local matches, use them
        if (localResults.length > 0 && localResults[0].symbol.toLowerCase() === query) {
          setSearchResults(localResults);
          setShowResults(true);
          setIsSearching(false);
          return;
        }

        // Otherwise, search via API for more comprehensive results
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const apiResults = await response.json();
          // Merge local and API results, preferring local for known symbols
          const mergedResults: SearchResult[] = [];
          const seenSymbols = new Set<string>();

          // Add local matches first
          localResults.forEach(r => {
            mergedResults.push(r);
            seenSymbols.add(r.symbol);
          });

          // Add API results that aren't duplicates
          apiResults.forEach((r: { symbol: string; name: string; type?: string }) => {
            if (!seenSymbols.has(r.symbol) && mergedResults.length < 8) {
              mergedResults.push({
                symbol: r.symbol,
                name: r.name,
                type: (r.type as 'stock' | 'index' | 'etf') || 'stock',
              });
              seenSymbols.add(r.symbol);
            }
          });

          setSearchResults(mergedResults);
        } else {
          // Fallback to local results only
          setSearchResults(localResults);
        }
      } catch (error) {
        // On error, use local results
        const query = searchQuery.toLowerCase();
        const localResults = SEARCHABLE_ITEMS.filter(
          (item) =>
            item.symbol.toLowerCase().includes(query) ||
            item.name.toLowerCase().includes(query)
        ).slice(0, 8);
        setSearchResults(localResults);
      }

      setShowResults(true);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery('');
    setShowResults(false);
    setShowMobileSearch(false);

    // Navigate based on type
    if (result.type === 'index') {
      router.push('/markets');
    } else {
      router.push(`/watchlist?add=${result.symbol}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false);
      setShowMobileSearch(false);
    }
    if (e.key === 'Enter' && searchResults.length > 0) {
      handleResultClick(searchResults[0]);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'stock': return 'Stock';
      case 'index': return 'Index';
      case 'etf': return 'ETF';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'stock': return 'bg-blue-500/20 text-blue-400';
      case 'index': return 'bg-purple-500/20 text-purple-400';
      case 'etf': return 'bg-green-500/20 text-green-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left Section: Logo & Menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors md:hidden"
          >
            <Menu className="h-5 w-5 text-slate-400" />
          </button>

          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:block">
              <span className="text-white">Apex</span>
              <span className="text-blue-500">Alpha</span>
            </span>
          </Link>
        </div>

        {/* Center Section: Search */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tickers, news, signals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowResults(true)}
              onKeyDown={handleKeyDown}
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-lg',
                'bg-slate-900 border border-slate-800',
                'text-sm text-slate-100 placeholder:text-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                'transition-all duration-200'
              )}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 animate-spin" />
            )}

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden z-50">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-100">{result.symbol}</span>
                      <span className="text-sm text-slate-500 truncate max-w-[200px]">{result.name}</span>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded', getTypeColor(result.type))}>
                      {getTypeLabel(result.type)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {showResults && searchQuery && searchResults.length === 0 && !isSearching && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-4 text-center text-slate-500 text-sm">
                No results found for &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Button */}
          <button
            onClick={() => setShowMobileSearch(true)}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors md:hidden"
          >
            <Search className="h-5 w-5 text-slate-400" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Bell className="h-5 w-5 text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-blue-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <h3 className="font-semibold text-slate-100">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-500 hover:text-blue-400"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      return (
                        <div
                          key={notification.id}
                          onClick={() => {
                            markAsRead(notification.id);
                            if (notification.symbol) {
                              router.push('/owned-assets');
                              setShowNotifications(false);
                            }
                          }}
                          className={cn(
                            'flex gap-3 px-4 py-3 hover:bg-slate-800/50 cursor-pointer transition-colors',
                            !notification.read && 'bg-slate-800/30'
                          )}
                        >
                          <div className={cn('p-2 rounded-lg flex-shrink-0', getNotificationColor(notification.type))}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium', notification.read ? 'text-slate-400' : 'text-slate-100')}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{notification.message}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3 text-slate-600" />
                              <span className="text-xs text-slate-600">{notification.time}</span>
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <Link
                  href="/settings"
                  onClick={() => setShowNotifications(false)}
                  className="block px-4 py-3 text-center text-sm text-blue-500 hover:text-blue-400 border-t border-slate-800"
                >
                  Notification Settings
                </Link>
              </div>
            )}
          </div>

          {/* User Menu */}
          <Link
            href="/settings"
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </Link>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 bg-slate-950 z-50 md:hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search tickers, news, signals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className={cn(
                    'w-full pl-10 pr-4 py-3 rounded-lg',
                    'bg-slate-900 border border-slate-800',
                    'text-sm text-slate-100 placeholder:text-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                  )}
                />
              </div>
              <button
                onClick={() => {
                  setShowMobileSearch(false);
                  setSearchQuery('');
                }}
                className="p-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Mobile Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-b-0"
                  >
                    <div>
                      <span className="font-semibold text-slate-100">{result.symbol}</span>
                      <p className="text-sm text-slate-500 truncate">{result.name}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded', getTypeColor(result.type))}>
                      {getTypeLabel(result.type)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !isSearching && (
              <div className="text-center text-slate-500 py-8">
                No results found for &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
