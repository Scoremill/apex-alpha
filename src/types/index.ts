import { Timestamp } from 'firebase/firestore';

// Signal Actions
export type SignalAction = 'STRONG_BUY' | 'ACCUMULATE' | 'HOLD' | 'EXIT';
export type SentimentLabel = 'Bullish' | 'Bearish' | 'Neutral';

// Market Data from Yahoo Finance
export interface MarketData {
  price: number;
  changePercent: number;
  change: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  avgVolume?: number;
}

// Technical Indicators
export interface Technicals {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  sma20: number;
  sma50: number;
  sma200: number;
  price: number;
}

// Sentiment Analysis Result
export interface SentimentResult {
  score: number; // -1.0 to 1.0
  label: SentimentLabel;
  rationale: string;
}

// Signal Result
export interface SignalResult {
  action: SignalAction;
  confidence: number; // 0-100
  rationale: string[];
}

// Firestore Document: Ticker
export interface TickerDoc {
  symbol: string;
  name: string;
  lastUpdated: Timestamp;
  marketData: {
    price: number;
    changePercent: number;
    change: number;
    volume: number;
    rsi14: number;
    macdHist: number;
  };
  sentiment: {
    score: number;
    label: SentimentLabel;
    rationale: string;
  };
  signal: {
    action: SignalAction;
    confidence: number;
    rationale: string[];
  };
}

// Firestore Document: Watchlist
export interface WatchlistDoc {
  id?: string;
  userId: string;
  name: string;
  symbols: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore Document: Signal History
export interface SignalHistoryDoc {
  symbol: string;
  timestamp: Timestamp;
  action: SignalAction;
  confidence: number;
  rationale: string[];
  marketData: {
    price: number;
    changePercent: number;
  };
}

// User type
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Index/Market symbols for the dashboard
export interface MarketIndex {
  symbol: string;
  name: string;
  displayName: string;
}

// Chart configuration
export interface ChartConfig {
  symbol: string;
  interval: '1D' | '1W' | '1M' | '3M' | '1Y';
  theme: 'dark' | 'light';
  width: number;
  height: number;
}
