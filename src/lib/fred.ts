export interface FredSeriesObservation {
    date: string;
    value: string;
}

export interface FredSeriesResponse {
    realtime_start: string;
    realtime_end: string;
    observation_start: string;
    observation_end: string;
    units: string;
    output_type: number;
    file_type: string;
    order_by: string;
    sort_order: string;
    count: number;
    offset: number;
    limit: number;
    observations: FredSeriesObservation[];
}

const FRED_API_BASE = 'https://api.stlouisfed.org/fred/series/observations';

export class FredClient {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getSeriesObservations(
        seriesId: string,
        params: {
            observation_start?: string;
            observation_end?: string;
            frequency?: string;
            units?: string;
            aggregation_method?: string;
        } = {}
    ): Promise<FredSeriesResponse> {
        // Use the instance apiKey or fall back to process.env.FRED_API_KEY
        // This ensures that even if the client was initialized before env vars were ready,
        // it still tries to grab the key at runtime.
        const apiKey = this.apiKey || process.env.FRED_API_KEY;

        if (!apiKey) {
            throw new Error('FRED_API_KEY is not defined');
        }

        const searchParams = new URLSearchParams({
            series_id: seriesId,
            api_key: apiKey,
            file_type: 'json',
        });

        // Only add optional params if they have values
        if (params.observation_start) searchParams.append('observation_start', params.observation_start);
        if (params.observation_end) searchParams.append('observation_end', params.observation_end);
        if (params.frequency) searchParams.append('frequency', params.frequency);
        if (params.units) searchParams.append('units', params.units);
        if (params.aggregation_method) searchParams.append('aggregation_method', params.aggregation_method);

        const response = await fetch(`${FRED_API_BASE}?${searchParams.toString()}`, {
            next: { revalidate: 3600 }, // Cache for 1 hour by default
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('FRED API Error:', response.status, errorText);
            throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }
}

// Initialize with empty string to rely on dynamic lookup if needed
export const fredClient = new FredClient(process.env.FRED_API_KEY || '');
