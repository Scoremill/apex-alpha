import type { ChartConfig } from '@/types';

const CHART_IMG_BASE_URL = 'https://api.chart-img.com/v1/tradingview/advanced-chart';

interface ChartImgParams {
  symbol: string;
  interval?: string;
  theme?: 'dark' | 'light';
  width?: number;
  height?: number;
  studies?: string[];
  timezone?: string;
}

// Map our interval format to Chart-IMG format
const intervalMap: Record<string, string> = {
  '1D': 'D',
  '1W': 'W',
  '1M': 'M',
  '3M': '3M',
  '1Y': '12M',
};

export function buildChartUrl(params: ChartImgParams): string {
  const {
    symbol,
    interval = '1D',
    theme = 'dark',
    width = 800,
    height = 400,
    studies = [],
    timezone = 'America/New_York',
  } = params;

  const searchParams = new URLSearchParams({
    symbol,
    interval: intervalMap[interval] || interval,
    theme,
    width: width.toString(),
    height: height.toString(),
    timezone,
  });

  // Add studies (technical indicators)
  if (studies.length > 0) {
    searchParams.append('studies', studies.join(','));
  }

  // Add API key if available
  const apiKey = process.env.NEXT_PUBLIC_CHART_IMG_API_KEY;
  if (apiKey) {
    searchParams.append('key', apiKey);
  }

  return `${CHART_IMG_BASE_URL}?${searchParams.toString()}`;
}

export function getTickerChartUrl(symbol: string, config?: Partial<ChartConfig>): string {
  return buildChartUrl({
    symbol: formatSymbolForChart(symbol),
    interval: config?.interval || '1D',
    theme: config?.theme || 'dark',
    width: config?.width || 400,
    height: config?.height || 220,
  });
}

export function getIndexChartUrl(symbol: string): string {
  return buildChartUrl({
    symbol: formatSymbolForChart(symbol),
    interval: '1D',
    theme: 'dark',
    width: 350,
    height: 200,
  });
}

// Format symbols for TradingView/Chart-IMG
function formatSymbolForChart(symbol: string): string {
  // Map common symbols to TradingView format
  const symbolMap: Record<string, string> = {
    // Indices
    'SPY': 'AMEX:SPY',
    'QQQ': 'NASDAQ:QQQ',
    'IWM': 'AMEX:IWM',
    'DIA': 'AMEX:DIA',
    '^GSPC': 'SP:SPX',
    '^DJI': 'DJ:DJI',
    '^IXIC': 'NASDAQ:IXIC',
    '^RUT': 'TVC:RUT',
    '^VIX': 'TVC:VIX',
    'VIX': 'TVC:VIX',
    // Dollar Index
    'DX-Y.NYB': 'TVC:DXY',
    'DXY': 'TVC:DXY',
    // Treasury Yields
    '^FVX': 'TVC:US05Y',
    '^TNX': 'TVC:US10Y',
    '^TYX': 'TVC:US30Y',
    // Canadian
    '^GSPTSE': 'TSX:TSX',
    'XIC.TO': 'TSX:XIC',
  };

  if (symbolMap[symbol]) {
    return symbolMap[symbol];
  }

  // For regular stocks, assume NASDAQ or NYSE
  if (!symbol.includes(':')) {
    return `NASDAQ:${symbol}`;
  }

  return symbol;
}

// Default market indices for dashboard
export const MARKET_INDICES = [
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', displayName: 'DOW' },
  { symbol: '^GSPC', name: 'S&P 500', displayName: 'S&P 500' },
  { symbol: '^IXIC', name: 'NASDAQ Composite', displayName: 'NASDAQ' },
  { symbol: '^RUT', name: 'Russell 2000', displayName: 'Russell 2000' },
  { symbol: '^VIX', name: 'Volatility Index', displayName: 'Volatility Index' },
  { symbol: 'DX-Y.NYB', name: 'US Dollar Index', displayName: 'US Dollar Index' },
  { symbol: '^FVX', name: '5-Year Treasury Yield', displayName: 'Treasury Yield 5 Years' },
  { symbol: '^TYX', name: '30-Year Treasury Yield', displayName: 'Treasury Yield 30 Years' },
];

// Default stocks for watchlist
export const DEFAULT_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { symbol: 'META', name: 'Meta Platforms, Inc.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
];
