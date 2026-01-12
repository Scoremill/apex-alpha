import { getDoc, setDoc, addDoc, Timestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, sentimentDoc, sentimentHistoryCollection } from './firebase';
import type { SentimentResult } from '@/types';

export interface StoredSentiment extends SentimentResult {
  symbol: string;
  analyzedAt: Timestamp;
  headlinesCount: number;
  headlines: string[];
}

export interface SentimentHistoryEntry {
  id?: string;
  score: number;
  label: string;
  rationale: string;
  analyzedAt: Timestamp;
  headlinesCount: number;
}

/**
 * Get the latest stored sentiment for a symbol
 */
export async function getStoredSentiment(symbol: string): Promise<StoredSentiment | null> {
  if (!db) {
    console.log('Firebase not configured, skipping sentiment fetch');
    return null;
  }

  try {
    const docRef = sentimentDoc(symbol);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as StoredSentiment;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching sentiment for ${symbol}:`, error);
    return null;
  }
}

/**
 * Store a new sentiment analysis result
 */
export async function storeSentiment(
  symbol: string,
  sentiment: SentimentResult,
  headlines: string[]
): Promise<void> {
  if (!db) {
    console.log('Firebase not configured, skipping sentiment storage');
    return;
  }

  try {
    const now = Timestamp.now();

    // Store the current sentiment
    const sentimentData: StoredSentiment = {
      ...sentiment,
      symbol,
      analyzedAt: now,
      headlinesCount: headlines.length,
      headlines: headlines.slice(0, 10), // Store up to 10 headlines
    };

    await setDoc(sentimentDoc(symbol), sentimentData);

    // Also add to history for historical tracking
    const historyEntry: SentimentHistoryEntry = {
      score: sentiment.score,
      label: sentiment.label,
      rationale: sentiment.rationale,
      analyzedAt: now,
      headlinesCount: headlines.length,
    };

    await addDoc(sentimentHistoryCollection(symbol), historyEntry);

    console.log(`Stored sentiment for ${symbol}`);
  } catch (error) {
    console.error(`Error storing sentiment for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get sentiment history for a symbol
 */
export async function getSentimentHistory(
  symbol: string,
  maxEntries: number = 30
): Promise<SentimentHistoryEntry[]> {
  if (!db) {
    return [];
  }

  try {
    const historyRef = sentimentHistoryCollection(symbol);
    const q = query(historyRef, orderBy('analyzedAt', 'desc'), limit(maxEntries));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SentimentHistoryEntry[];
  } catch (error) {
    console.error(`Error fetching sentiment history for ${symbol}:`, error);
    return [];
  }
}

/**
 * Format the analyzed date for display
 */
export function formatSentimentDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
