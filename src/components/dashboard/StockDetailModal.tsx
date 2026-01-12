'use client';

import { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Activity,
  Calendar,
  RefreshCw,
  BarChart2,
  Target,
  AlertCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { cn, formatCurrency, formatPercent, getChangeColor } from '@/lib/utils';
import { DetailChart } from './DetailChart';
import { SignalBadge } from './SignalBadge';
import type { MarketData, SignalResult, Technicals } from '@/types';

interface SentimentData {
  score: number;
  label: 'Bullish' | 'Bearish' | 'Neutral';
  rationale: string;
  analyzedAt?: string | null;
  headlinesCount?: number;
}

interface EarningsData {
  quarter: string;
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  surprise: number | null;
}

interface SECEarningsData {
  quarter: string;
  fiscalYear: number;
  fiscalPeriod: string;
  endDate: string;
  filedDate: string;
  form: string;
  eps: number | null;
  revenue: number | null;
  netIncome: number | null;
  grossProfit: number | null;
}

interface AnalystRecommendation {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  targetPrice: number | null;
}

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
}

export function StockDetailModal({ isOpen, onClose, symbol, name }: StockDetailModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingSentiment, setIsRefreshingSentiment] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [showMACD, setShowMACD] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [chartDates, setChartDates] = useState<string[]>([]);
  const [technicals, setTechnicals] = useState<Technicals | null>(null);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [yahooEarnings, setYahooEarnings] = useState<EarningsData[]>([]);
  const [secEarnings, setSecEarnings] = useState<SECEarningsData[]>([]);
  const [recommendation, setRecommendation] = useState<AnalystRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earningsSource, setEarningsSource] = useState<'yahoo' | 'sec'>('sec');

  // Load cached sentiment from localStorage on mount
  useEffect(() => {
    if (isOpen && symbol) {
      // First, load cached sentiment from localStorage for immediate display
      const cachedSentiment = loadCachedSentiment(symbol);
      if (cachedSentiment) {
        setSentiment(cachedSentiment);
      }

      fetchStockData();
      fetchSECEarnings();
    }
  }, [isOpen, symbol, chartPeriod]);

  async function fetchStockData() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/stock-detail?symbol=${encodeURIComponent(symbol)}&period=${chartPeriod.toLowerCase()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stock data');
      }

      const data = await response.json();

      setMarketData(data.marketData);
      setSparklineData(data.sparklineData || []);
      // Generate dates for chart (approximate based on data length)
      setChartDates(generateDates(data.sparklineData?.length || 0, chartPeriod));
      setTechnicals(data.technicals);
      // Only update sentiment from API if we have new data, otherwise keep cached
      if (data.sentiment) {
        setSentiment(data.sentiment);
        // Also cache it for next time
        cacheSentiment(symbol, data.sentiment);
      }
      setSignal(data.signal);
      setYahooEarnings(data.earnings || []);
      setRecommendation(data.recommendation);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Failed to load stock data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchSECEarnings() {
    try {
      const response = await fetch(`/api/sec-earnings?symbol=${encodeURIComponent(symbol)}`);
      if (response.ok) {
        const data = await response.json();
        setSecEarnings(data.earnings || []);
      }
    } catch (err) {
      console.error('Error fetching SEC earnings:', err);
    }
  }

  async function refreshSentiment() {
    setIsRefreshingSentiment(true);

    try {
      const response = await fetch('/api/refresh-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh sentiment');
      }

      const data = await response.json();
      const newSentiment = {
        ...data.sentiment,
        analyzedAt: data.storedAt,
        headlinesCount: data.headlinesAnalyzed,
      };
      setSentiment(newSentiment);
      // Cache the new sentiment in localStorage for persistence
      cacheSentiment(symbol, newSentiment);
      setSignal(data.signal);
    } catch (err) {
      console.error('Error refreshing sentiment:', err);
    } finally {
      setIsRefreshingSentiment(false);
    }
  }

  if (!isOpen) return null;

  // Determine which earnings to show
  const earnings = earningsSource === 'sec' && secEarnings.length > 0 ? secEarnings : yahooEarnings;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 rounded-xl border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-100">{symbol}</h2>
                {signal && <SignalBadge action={signal.action} confidence={signal.confidence} showConfidence />}
              </div>
              <p className="text-slate-400 mt-1">{name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Price Info */}
          {marketData && (
            <div className="flex items-baseline gap-4 mt-4">
              <span className="text-3xl font-bold text-slate-100">
                {formatCurrency(marketData.price)}
              </span>
              <span className={cn('text-lg font-semibold', getChangeColor(marketData.changePercent))}>
                {marketData.change >= 0 ? '+' : ''}{formatCurrency(marketData.change)}
                ({formatPercent(marketData.changePercent)})
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-slate-400 mt-4">Loading stock data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="text-slate-400 mt-4">{error}</p>
              <button
                onClick={fetchStockData}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Chart Section */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5" />
                    Price Chart
                  </h3>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setShowMACD(!showMACD)}
                      className={cn(
                        'px-3 py-1 text-sm rounded-lg transition-colors',
                        showMACD
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      )}
                    >
                      MACD
                    </button>
                    <div className="w-px h-6 bg-slate-700" />
                    <div className="flex gap-1">
                      {(['1M', '3M', '6M', '1Y'] as const).map((period) => (
                        <button
                          key={period}
                          onClick={() => setChartPeriod(period)}
                          className={cn(
                            'px-3 py-1 text-sm rounded-lg transition-colors',
                            chartPeriod === period
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          )}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="w-full flex items-center justify-center">
                  {sparklineData.length > 0 ? (
                    <DetailChart
                      priceData={sparklineData}
                      dates={chartDates}
                      technicals={technicals}
                      showMACD={showMACD}
                      width={680}
                      height={showMACD ? 280 : 200}
                    />
                  ) : (
                    <p className="text-slate-500 py-12">No chart data available</p>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Open" value={formatCurrency(marketData?.open ?? 0)} />
                <StatCard label="High" value={formatCurrency(marketData?.high ?? 0)} />
                <StatCard label="Low" value={formatCurrency(marketData?.low ?? 0)} />
                <StatCard label="Prev Close" value={formatCurrency(marketData?.previousClose ?? 0)} />
              </div>

              {/* Extended Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="52W High" value={formatCurrency(marketData?.fiftyTwoWeekHigh ?? 0)} />
                <StatCard label="52W Low" value={formatCurrency(marketData?.fiftyTwoWeekLow ?? 0)} />
                <StatCard label="Volume" value={formatVolume(marketData?.volume ?? 0)} />
                <StatCard label="Avg Volume" value={formatVolume(marketData?.avgVolume ?? 0)} />
              </div>

              {/* Sentiment & Signal Section */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Sentiment */}
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      AI Sentiment
                    </h3>
                    <button
                      onClick={refreshSentiment}
                      disabled={isRefreshingSentiment}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm',
                        isRefreshingSentiment
                          ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      )}
                    >
                      <RefreshCw
                        className={cn('w-4 h-4', isRefreshingSentiment && 'animate-spin')}
                      />
                      {isRefreshingSentiment ? 'Analyzing...' : 'Refresh'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Based on recent news headlines analysis</p>
                  {sentiment ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={cn(
                            'text-2xl font-bold',
                            sentiment.label === 'Bullish' && 'text-green-500',
                            sentiment.label === 'Bearish' && 'text-red-500',
                            sentiment.label === 'Neutral' && 'text-slate-400'
                          )}
                        >
                          {sentiment.label}
                        </span>
                        <span className="text-slate-500">
                          ({sentiment.score > 0 ? '+' : ''}
                          {(sentiment.score * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{sentiment.rationale}</p>
                      {sentiment.analyzedAt && (
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          Analyzed {formatRelativeTime(sentiment.analyzedAt)}
                          {sentiment.headlinesCount && (
                            <span>• {sentiment.headlinesCount} headlines</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500 py-4 text-center">
                      <p>No sentiment data available</p>
                      <p className="text-sm mt-1">Click Refresh to analyze current news</p>
                    </div>
                  )}
                </div>

                {/* Technical Indicators */}
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5" />
                    Technical Indicators
                  </h3>
                  {technicals ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-slate-500">RSI (14)</span>
                        <p
                          className={cn(
                            'text-lg font-semibold',
                            technicals.rsi > 70
                              ? 'text-red-500'
                              : technicals.rsi < 30
                              ? 'text-green-500'
                              : 'text-slate-100'
                          )}
                        >
                          {technicals.rsi.toFixed(1)}
                          <span className="text-xs text-slate-500 ml-1">
                            {technicals.rsi > 70 ? '(Overbought)' : technicals.rsi < 30 ? '(Oversold)' : ''}
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">MACD Histogram</span>
                        <p
                          className={cn(
                            'text-lg font-semibold',
                            technicals.macdHist > 0 ? 'text-green-500' : 'text-red-500'
                          )}
                        >
                          {technicals.macdHist.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">SMA 20</span>
                        <p className="text-lg font-semibold text-slate-100">
                          {formatCurrency(technicals.sma20)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">SMA 50</span>
                        <p className="text-lg font-semibold text-slate-100">
                          {formatCurrency(technicals.sma50)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500">No technical data available</p>
                  )}
                </div>
              </div>

              {/* Analyst Recommendation */}
              {recommendation && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5" />
                    Analyst Recommendations
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">Wall Street analyst consensus ratings</p>
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-shrink-0 text-center">
                      <span
                        className={cn(
                          'text-2xl font-bold',
                          recommendation.rating === 'Strong Buy' && 'text-green-400',
                          recommendation.rating === 'Buy' && 'text-green-500',
                          recommendation.rating === 'Hold' && 'text-yellow-500',
                          recommendation.rating === 'Sell' && 'text-red-500',
                          recommendation.rating === 'Strong Sell' && 'text-red-600'
                        )}
                      >
                        {recommendation.rating}
                      </span>
                      {recommendation.targetPrice && (
                        <p className="text-sm text-slate-400 mt-1">
                          Target: {formatCurrency(recommendation.targetPrice)}
                        </p>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex h-6 rounded-lg overflow-hidden">
                        <div
                          className="bg-green-600"
                          style={{
                            width: `${getPercent(recommendation.strongBuy, recommendation)}%`,
                          }}
                        />
                        <div
                          className="bg-green-400"
                          style={{ width: `${getPercent(recommendation.buy, recommendation)}%` }}
                        />
                        <div
                          className="bg-yellow-500"
                          style={{ width: `${getPercent(recommendation.hold, recommendation)}%` }}
                        />
                        <div
                          className="bg-red-400"
                          style={{ width: `${getPercent(recommendation.sell, recommendation)}%` }}
                        />
                        <div
                          className="bg-red-600"
                          style={{
                            width: `${getPercent(recommendation.strongSell, recommendation)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-slate-500">
                        <span>Strong Buy ({recommendation.strongBuy})</span>
                        <span>Buy ({recommendation.buy})</span>
                        <span>Hold ({recommendation.hold})</span>
                        <span>Sell ({recommendation.sell})</span>
                        <span>Strong Sell ({recommendation.strongSell})</span>
                      </div>
                    </div>
                  </div>
                  {/* Conflict Notice */}
                  {sentiment && hasConflict(sentiment, recommendation) && (
                    <div className="mt-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-200">
                        <span className="font-semibold">Note:</span> AI Sentiment and Analyst Recommendations may differ.
                        AI analyzes recent news headlines for market sentiment, while analyst ratings reflect
                        Wall Street's long-term fundamental outlook. Both perspectives are intentionally shown to provide
                        a complete picture.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Earnings */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Quarterly Earnings
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEarningsSource('sec')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1 text-sm rounded-lg transition-colors',
                        earningsSource === 'sec'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      )}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      SEC
                    </button>
                    <button
                      onClick={() => setEarningsSource('yahoo')}
                      className={cn(
                        'px-3 py-1 text-sm rounded-lg transition-colors',
                        earningsSource === 'yahoo'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      )}
                    >
                      Yahoo
                    </button>
                  </div>
                </div>
                {earnings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 border-b border-slate-700">
                          <th className="text-left py-2">Quarter</th>
                          <th className="text-right py-2">End Date</th>
                          <th className="text-right py-2">EPS</th>
                          {earningsSource === 'sec' && (
                            <>
                              <th className="text-right py-2">Revenue</th>
                              <th className="text-right py-2">Net Income</th>
                            </>
                          )}
                          {earningsSource === 'yahoo' && (
                            <>
                              <th className="text-right py-2">EPS Est.</th>
                              <th className="text-right py-2">Surprise</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {earnings.slice(0, 4).map((q, idx) => (
                          <tr key={idx} className="border-b border-slate-700/50">
                            <td className="py-3 text-slate-200">
                              {'fiscalPeriod' in q ? q.quarter : q.quarter}
                            </td>
                            <td className="text-right text-slate-400">
                              {'endDate' in q ? formatDate(q.endDate) : q.date}
                            </td>
                            <td className="text-right text-slate-200">
                              {'eps' in q
                                ? (q.eps !== null ? `$${q.eps.toFixed(2)}` : '-')
                                : (q.epsActual !== null ? `$${q.epsActual.toFixed(2)}` : '-')}
                            </td>
                            {earningsSource === 'sec' && 'revenue' in q && (
                              <>
                                <td className="text-right text-slate-200">
                                  {formatLargeNumber(q.revenue)}
                                </td>
                                <td className={cn(
                                  'text-right',
                                  q.netIncome !== null && q.netIncome > 0 ? 'text-green-500' : 'text-red-500'
                                )}>
                                  {formatLargeNumber(q.netIncome)}
                                </td>
                              </>
                            )}
                            {earningsSource === 'yahoo' && 'epsEstimate' in q && (
                              <>
                                <td className="text-right text-slate-400">
                                  {q.epsEstimate !== null ? `$${q.epsEstimate.toFixed(2)}` : '-'}
                                </td>
                                <td
                                  className={cn(
                                    'text-right font-medium',
                                    q.surprise !== null && q.surprise > 0
                                      ? 'text-green-500'
                                      : q.surprise !== null && q.surprise < 0
                                      ? 'text-red-500'
                                      : 'text-slate-400'
                                  )}
                                >
                                  {q.surprise !== null
                                    ? `${q.surprise > 0 ? '+' : ''}${(q.surprise * 100).toFixed(1)}%`
                                    : '-'}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {earningsSource === 'sec' && (
                      <p className="text-xs text-slate-500 mt-2">
                        Source: SEC EDGAR (10-K/10-Q filings)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">No earnings data available</p>
                )}
              </div>

              {/* Signal Rationale */}
              {signal && signal.rationale.length > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">Signal Rationale</h3>
                  <ul className="space-y-2">
                    {signal.rationale.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-blue-500 mt-1">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <span className="text-xs text-slate-500">{label}</span>
      <p className="text-lg font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function getPercent(value: number, rec: AnalystRecommendation): number {
  const total = rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell;
  return total > 0 ? (value / total) * 100 : 0;
}

function hasConflict(sentiment: SentimentData, recommendation: AnalystRecommendation): boolean {
  // Check if AI sentiment conflicts with analyst recommendation
  const isSentimentBullish = sentiment.label === 'Bullish';
  const isSentimentBearish = sentiment.label === 'Bearish';
  const isAnalystBullish = recommendation.rating === 'Strong Buy' || recommendation.rating === 'Buy';
  const isAnalystBearish = recommendation.rating === 'Sell' || recommendation.rating === 'Strong Sell';

  // Conflict exists when they point in opposite directions
  return (isSentimentBullish && isAnalystBearish) || (isSentimentBearish && isAnalystBullish);
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatLargeNumber(value: number | null): string {
  if (value === null) return '-';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e12) {
    return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
  } else if (absValue >= 1e9) {
    return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
  } else if (absValue >= 1e6) {
    return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
  } else if (absValue >= 1e3) {
    return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
  }

  return `${sign}$${absValue.toFixed(2)}`;
}

function formatVolume(value: number): string {
  if (value === 0) return '-';

  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }

  return value.toLocaleString();
}

function generateDates(count: number, period: string): string[] {
  if (count === 0) return [];

  const dates: string[] = [];
  const now = new Date();
  let daysBack = 30;

  switch (period) {
    case '1M': daysBack = 30; break;
    case '3M': daysBack = 90; break;
    case '6M': daysBack = 180; break;
    case '1Y': daysBack = 365; break;
  }

  const interval = daysBack / count;

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getTime() - (daysBack - i * interval) * 24 * 60 * 60 * 1000);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

// LocalStorage helpers for sentiment persistence
const SENTIMENT_CACHE_KEY = 'apex_sentiment_cache';

interface CachedSentiment {
  score: number;
  label: 'Bullish' | 'Bearish' | 'Neutral';
  rationale: string;
  analyzedAt?: string | null;
  headlinesCount?: number;
}

function loadCachedSentiment(symbol: string): CachedSentiment | null {
  if (typeof window === 'undefined') return null;

  try {
    const cache = localStorage.getItem(SENTIMENT_CACHE_KEY);
    if (!cache) return null;

    const parsed = JSON.parse(cache);
    return parsed[symbol.toUpperCase()] || null;
  } catch {
    return null;
  }
}

function cacheSentiment(symbol: string, sentiment: CachedSentiment): void {
  if (typeof window === 'undefined') return;

  try {
    const cache = localStorage.getItem(SENTIMENT_CACHE_KEY);
    const parsed = cache ? JSON.parse(cache) : {};

    parsed[symbol.toUpperCase()] = {
      ...sentiment,
      cachedAt: new Date().toISOString(),
    };

    localStorage.setItem(SENTIMENT_CACHE_KEY, JSON.stringify(parsed));
  } catch (err) {
    console.error('Failed to cache sentiment:', err);
  }
}

export default StockDetailModal;
