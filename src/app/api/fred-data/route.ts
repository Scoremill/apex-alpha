import { NextResponse } from 'next/server';
import { fredClient } from '@/lib/fred';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const seriesId = searchParams.get('series_id');
        const start = searchParams.get('start_date');
        const end = searchParams.get('end_date');

        if (!seriesId) {
            return NextResponse.json({ error: 'Missing series_id parameter' }, { status: 400 });
        }

        // Check if API key is configured
        if (!process.env.FRED_API_KEY) {
            console.error('ERROR: FRED_API_KEY is missing in server environment');
            return NextResponse.json({ error: 'FRED API key not configured' }, { status: 500 });
        }

        const maskedKey = process.env.FRED_API_KEY.substring(0, 4) + '...';
        console.log(`Fetching FRED series: ${seriesId} with key starting: ${maskedKey}`);

        // Default to 1 year of data if not specified
        const data = await fredClient.getSeriesObservations(seriesId, {
            observation_start: start || undefined,
            observation_end: end || undefined,
        });

        console.log(`Successfully fetched ${data.observations?.length || 0} observations for ${seriesId}`);

        return NextResponse.json(data);
    } catch (error) {
        console.error('CRITICAL ERROR in FRED route:', error);
        return NextResponse.json(
            { error: 'Failed to fetch FRED data', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
