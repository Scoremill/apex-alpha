import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import type { TickerDoc } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbolsParam = searchParams.get('symbols');

    if (!symbolsParam) {
      return NextResponse.json(
        { error: 'Missing symbols parameter' },
        { status: 400 }
      );
    }

    const symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase());

    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'No valid symbols provided' },
        { status: 400 }
      );
    }

    // Return empty if Firebase not configured
    if (!db) {
      return NextResponse.json({});
    }

    // Firestore 'in' queries support max 10 items at a time
    const result: Record<string, { signal: TickerDoc['signal']; sentiment: TickerDoc['sentiment'] }> = {};

    // Split into chunks of 10
    const chunks = [];
    for (let i = 0; i < symbols.length; i += 10) {
      chunks.push(symbols.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      try {
        const tickersRef = collection(db, 'tickers');
        const q = query(tickersRef, where(documentId(), 'in', chunk));
        const snapshot = await getDocs(q);

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as TickerDoc;
          result[docSnap.id] = {
            signal: data.signal,
            sentiment: data.sentiment,
          };
        });
      } catch (error) {
        // Firestore might not be configured yet, return empty results
        console.log('Firestore query skipped (not configured or empty):', error);
      }
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error in signals API:', error);
    // Return empty object instead of error if Firestore isn't set up
    return NextResponse.json({});
  }
}
