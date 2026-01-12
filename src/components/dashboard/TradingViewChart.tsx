'use client';

import { useEffect, useRef, memo } from 'react';

interface TradingViewChartProps {
  symbol: string;
  width?: number | string;
  height?: number;
  theme?: 'dark' | 'light';
  interval?: string;
  hideTopToolbar?: boolean;
  hideSideToolbar?: boolean;
}

function TradingViewChartComponent({
  symbol,
  width = '100%',
  height = 180,
  theme = 'dark',
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = '';
    scriptLoadedRef.current = false;

    // Format symbol for TradingView
    const tvSymbol = formatSymbol(symbol);

    // Create unique container ID
    const containerId = `tv-chart-${symbol.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.id = containerId;
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    widgetContainer.appendChild(widgetDiv);

    containerRef.current.appendChild(widgetContainer);

    // Load TradingView Lightweight Charts script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [[tvSymbol, tvSymbol]],
      chartOnly: true,
      width: '100%',
      height: '100%',
      locale: 'en',
      colorTheme: theme,
      autosize: true,
      showVolume: false,
      showMA: false,
      hideDateRanges: true,
      hideMarketStatus: true,
      hideSymbolLogo: true,
      scalePosition: 'no',
      scaleMode: 'Normal',
      fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
      fontSize: '10',
      noTimeScale: true,
      valuesTracking: '0',
      changeMode: 'no-values',
      chartType: 'area',
      lineWidth: 2,
      lineType: 0,
      dateRanges: ['1m|1D'],
    });

    widgetContainer.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme]);

  return (
    <div
      ref={containerRef}
      style={{ height, width, overflow: 'hidden' }}
    />
  );
}

// Memoize to prevent unnecessary re-renders
export const TradingViewChart = memo(TradingViewChartComponent);

// Full-featured chart for modals/detail views
export function TradingViewAdvancedChart({
  symbol,
  width = '100%',
  height = 400,
  theme = 'dark',
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const tvSymbol = formatSymbol(symbol);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: 'D',
      timezone: 'America/New_York',
      theme: theme,
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_side_toolbar: true,
      withdateranges: true,
      save_image: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = 'calc(100% - 32px)';
    widgetDiv.style.width = '100%';
    widgetContainer.appendChild(widgetDiv);
    widgetContainer.appendChild(script);

    containerRef.current.appendChild(widgetContainer);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme]);

  return (
    <div
      ref={containerRef}
      style={{ height, width, overflow: 'hidden' }}
    />
  );
}

// Format symbols for TradingView - use ETF equivalents for better widget compatibility
function formatSymbol(symbol: string): string {
  const symbolMap: Record<string, string> = {
    // Indices - use ETF equivalents for better TradingView widget support
    '^GSPC': 'AMEX:SPY',      // S&P 500 -> SPY ETF
    '^DJI': 'AMEX:DIA',       // Dow Jones -> DIA ETF
    '^IXIC': 'NASDAQ:QQQ',    // NASDAQ -> QQQ ETF
    '^RUT': 'AMEX:IWM',       // Russell 2000 -> IWM ETF
    '^VIX': 'AMEX:VXX',       // VIX -> VXX ETN (volatility)
    '^GSPTSE': 'TSX:XIU',     // S&P/TSX -> XIU ETF
    'DX-Y.NYB': 'AMEX:UUP',   // US Dollar Index -> UUP ETF
    '^FVX': 'NASDAQ:SHY',     // 5Y Treasury -> SHY ETF (short-term treasury)
    '^TNX': 'NASDAQ:IEF',     // 10Y Treasury -> IEF ETF
    '^TYX': 'NASDAQ:TLT',     // 30Y Treasury -> TLT ETF (long-term treasury)
  };

  if (symbolMap[symbol]) {
    return symbolMap[symbol];
  }

  // For regular stocks, check common exchanges
  if (!symbol.includes(':') && !symbol.startsWith('^')) {
    // Major tech stocks are on NASDAQ
    const nasdaqStocks = ['AAPL', 'GOOGL', 'GOOG', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'AMD', 'NFLX', 'INTC', 'CSCO', 'ADBE', 'PYPL'];
    if (nasdaqStocks.includes(symbol)) {
      return `NASDAQ:${symbol}`;
    }
    // Default to NYSE for others
    return `NYSE:${symbol}`;
  }

  return symbol;
}

export default TradingViewChart;
