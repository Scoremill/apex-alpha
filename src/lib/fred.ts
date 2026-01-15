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
        const searchParams = new URLSearchParams({
            series_id: seriesId,
            api_key: this.apiKey,
            file_type: 'json',
            ...params,
        });

        const response = await fetch(`${FRED_API_BASE}?${searchParams.toString()}`, {
            next: { revalidate: 3600 }, // Cache for 1 hour by default
        });

        if (!response.ok) {
            throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }
}

export const fredClient = new FredClient(process.env.FRED_API_KEY || '');
