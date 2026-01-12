import type { Technicals, SignalAction, SignalResult, SentimentResult } from '@/types';

export function generateSignal(
  technicals: Technicals,
  sentiment: SentimentResult
): SignalResult {
  let score = 0;
  const rationale: string[] = [];

  // 1. RSI Analysis (15% weight)
  if (technicals.rsi < 30) {
    score += 15;
    rationale.push('RSI Oversold (<30)');
  } else if (technicals.rsi < 40) {
    score += 10;
    rationale.push('RSI Approaching Oversold');
  } else if (technicals.rsi > 70) {
    score -= 15;
    rationale.push('RSI Overbought (>70)');
  } else if (technicals.rsi > 60) {
    score -= 5;
    rationale.push('RSI Elevated');
  }

  // 2. MACD Analysis (15% weight)
  if (technicals.macdHist > 0) {
    if (technicals.macd > technicals.macdSignal) {
      score += 15;
      rationale.push('MACD Bullish Crossover');
    } else {
      score += 8;
      rationale.push('Positive MACD Momentum');
    }
  } else {
    if (technicals.macd < technicals.macdSignal) {
      score -= 15;
      rationale.push('MACD Bearish Crossover');
    } else {
      score -= 8;
      rationale.push('Negative MACD Momentum');
    }
  }

  // 3. Moving Average Analysis (20% weight)
  const price = technicals.price;

  // Price vs SMA 20
  if (price > technicals.sma20) {
    score += 5;
  } else {
    score -= 5;
  }

  // Price vs SMA 50
  if (price > technicals.sma50) {
    score += 7;
    rationale.push('Above 50-day SMA');
  } else {
    score -= 7;
    rationale.push('Below 50-day SMA');
  }

  // Price vs SMA 200 (most important)
  if (price > technicals.sma200) {
    score += 8;
    rationale.push('Above 200-day SMA (Long-term Bullish)');
  } else {
    score -= 8;
    rationale.push('Below 200-day SMA (Long-term Bearish)');
  }

  // Golden/Death Cross detection
  if (technicals.sma50 > technicals.sma200 && price > technicals.sma50) {
    score += 5;
    rationale.push('Golden Cross Pattern');
  } else if (technicals.sma50 < technicals.sma200 && price < technicals.sma50) {
    score -= 5;
    rationale.push('Death Cross Pattern');
  }

  // 4. Sentiment Analysis (50% weight) - AI Powered
  // Convert sentiment score (-1 to 1) to points (-50 to 50)
  const sentimentPoints = sentiment.score * 50;
  score += sentimentPoints;

  if (sentiment.score > 0.5) {
    rationale.push(`AI: Strong Positive Sentiment (${sentiment.label})`);
  } else if (sentiment.score > 0.2) {
    rationale.push(`AI: Positive Sentiment (${sentiment.label})`);
  } else if (sentiment.score < -0.5) {
    rationale.push(`AI: Strong Negative Sentiment (${sentiment.label})`);
  } else if (sentiment.score < -0.2) {
    rationale.push(`AI: Negative Sentiment (${sentiment.label})`);
  } else {
    rationale.push(`AI: Neutral Sentiment`);
  }

  // Normalize score to 0-100 range
  // Current range is roughly -100 to +100, we want 0 to 100
  const normalizedScore = Math.round(Math.max(0, Math.min(100, (score + 100) / 2)));

  // Determine action based on final score
  let action: SignalAction;
  if (normalizedScore >= 75) {
    action = 'STRONG_BUY';
  } else if (normalizedScore >= 60) {
    action = 'ACCUMULATE';
  } else if (normalizedScore <= 25) {
    action = 'EXIT';
  } else {
    action = 'HOLD';
  }

  return {
    action,
    confidence: normalizedScore,
    rationale,
  };
}

// Quick signal without sentiment (for real-time updates)
export function generateQuickSignal(technicals: Technicals): Omit<SignalResult, 'rationale'> & { rationale: string[] } {
  const neutralSentiment: SentimentResult = {
    score: 0,
    label: 'Neutral',
    rationale: 'Sentiment not analyzed',
  };

  return generateSignal(technicals, neutralSentiment);
}

// Signal action to color mapping
export function getSignalColor(action: SignalAction): {
  bg: string;
  text: string;
  border: string;
} {
  switch (action) {
    case 'STRONG_BUY':
      return {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/50',
      };
    case 'ACCUMULATE':
      return {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        border: 'border-emerald-500/50',
      };
    case 'HOLD':
      return {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/50',
      };
    case 'EXIT':
      return {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/50',
      };
  }
}

// Confidence level description
export function getConfidenceLevel(confidence: number): string {
  if (confidence >= 80) return 'Very High';
  if (confidence >= 65) return 'High';
  if (confidence >= 50) return 'Moderate';
  if (confidence >= 35) return 'Low';
  return 'Very Low';
}
