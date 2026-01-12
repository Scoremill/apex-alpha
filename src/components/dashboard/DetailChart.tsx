'use client';

import { useEffect, useRef, useMemo } from 'react';
import type { Technicals } from '@/types';

interface DetailChartProps {
  priceData: number[];
  dates?: string[];
  technicals?: Technicals | null;
  showMACD?: boolean;
  width?: number;
  height?: number;
}

interface MACDData {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function DetailChart({
  priceData,
  dates = [],
  technicals,
  showMACD = false,
  width = 700,
  height = showMACD ? 280 : 200,
}: DetailChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate MACD data from price series
  const macdData = useMemo(() => {
    if (!showMACD || priceData.length < 26) return null;
    return calculateMACD(priceData);
  }, [priceData, showMACD]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceData.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up for retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Layout calculations
    const priceChartHeight = showMACD ? height * 0.65 : height;
    const macdChartHeight = showMACD ? height * 0.30 : 0;
    const macdChartTop = priceChartHeight + height * 0.05;

    const leftPadding = 60;
    const rightPadding = 10;
    const topPadding = 10;
    const bottomPadding = showMACD ? 5 : 25;

    const chartWidth = width - leftPadding - rightPadding;
    const priceChartContentHeight = priceChartHeight - topPadding - bottomPadding;

    // Determine price color
    const isPositive = priceData[priceData.length - 1] >= priceData[0];
    const lineColor = isPositive ? '#22c55e' : '#ef4444';
    const fillColor = isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';

    // Draw price chart
    drawPriceChart(ctx, {
      data: priceData,
      dates,
      x: leftPadding,
      y: topPadding,
      width: chartWidth,
      height: priceChartContentHeight,
      lineColor,
      fillColor,
      sma20: technicals?.sma20,
      sma50: technicals?.sma50,
    });

    // Draw MACD chart if enabled
    if (showMACD && macdData) {
      drawMACDChart(ctx, {
        macdData,
        x: leftPadding,
        y: macdChartTop,
        width: chartWidth,
        height: macdChartHeight - 20,
      });
    }

  }, [priceData, dates, technicals, showMACD, macdData, width, height]);

  if (priceData.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-slate-600 text-sm"
      >
        Insufficient data for chart
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  );
}

interface DrawPriceChartOptions {
  data: number[];
  dates: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  lineColor: string;
  fillColor: string;
  sma20?: number;
  sma50?: number;
}

function drawPriceChart(ctx: CanvasRenderingContext2D, options: DrawPriceChartOptions) {
  const { data, dates, x, y, width, height, lineColor, fillColor, sma20, sma50 } = options;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = range * 0.05; // 5% padding

  const yMin = min - padding;
  const yMax = max + padding;
  const yRange = yMax - yMin;

  // Calculate points
  const points: { x: number; y: number }[] = data.map((value, index) => ({
    x: x + (index / (data.length - 1)) * width,
    y: y + height - ((value - yMin) / yRange) * height,
  }));

  // Draw grid lines
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
  ctx.lineWidth = 1;

  // Horizontal grid lines (5 lines)
  for (let i = 0; i <= 4; i++) {
    const gridY = y + (i / 4) * height;
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x + width, gridY);
    ctx.stroke();
  }

  // Draw Y-axis labels (price)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= 4; i++) {
    const gridY = y + (i / 4) * height;
    const price = yMax - (i / 4) * yRange;
    ctx.fillText(formatPrice(price), x - 8, gridY);
  }

  // Draw X-axis labels (dates)
  if (dates.length > 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const dateStep = Math.floor(dates.length / 4);

    for (let i = 0; i < 5; i++) {
      const dateIndex = Math.min(i * dateStep, dates.length - 1);
      const dateX = x + (dateIndex / (data.length - 1)) * width;
      const dateLabel = formatDateLabel(dates[dateIndex]);
      ctx.fillText(dateLabel, dateX, y + height + 8);
    }
  }

  // Draw SMA lines if available
  if (sma20) {
    const smaY = y + height - ((sma20 - yMin) / yRange) * height;
    if (smaY >= y && smaY <= y + height) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, smaY);
      ctx.lineTo(x + width, smaY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('SMA20', x + width + 5, smaY);
    }
  }

  if (sma50) {
    const smaY = y + height - ((sma50 - yMin) / yRange) * height;
    if (smaY >= y && smaY <= y + height) {
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, smaY);
      ctx.lineTo(x + width, smaY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#8b5cf6';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('SMA50', x + width + 5, smaY);
    }
  }

  // Draw fill gradient
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  gradient.addColorStop(0, fillColor);
  gradient.addColorStop(1, 'transparent');

  ctx.beginPath();
  ctx.moveTo(points[0].x, y + height);
  points.forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(points[points.length - 1].x, y + height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw price line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Draw current price marker
  const lastPoint = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
}

interface DrawMACDChartOptions {
  macdData: MACDData;
  x: number;
  y: number;
  width: number;
  height: number;
}

function drawMACDChart(ctx: CanvasRenderingContext2D, options: DrawMACDChartOptions) {
  const { macdData, x, y, width, height } = options;
  const { macd, signal, histogram } = macdData;

  // Draw MACD label
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('MACD', x, y - 5);

  // Calculate min/max for MACD
  const allValues = [...macd, ...signal, ...histogram];
  const absMax = Math.max(...allValues.map(Math.abs));
  const yMin = -absMax * 1.1;
  const yMax = absMax * 1.1;
  const yRange = yMax - yMin;

  // Draw zero line
  const zeroY = y + height / 2;
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, zeroY);
  ctx.lineTo(x + width, zeroY);
  ctx.stroke();

  // Draw histogram bars
  const barWidth = Math.max(1, width / histogram.length - 1);

  histogram.forEach((value, index) => {
    const barX = x + (index / (histogram.length - 1)) * width - barWidth / 2;
    const barHeight = (Math.abs(value) / yRange) * height;
    const barY = value >= 0 ? zeroY - barHeight : zeroY;

    ctx.fillStyle = value >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
  });

  // Draw MACD line
  ctx.beginPath();
  macd.forEach((value, index) => {
    const px = x + (index / (macd.length - 1)) * width;
    const py = y + height - ((value - yMin) / yRange) * height;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw Signal line
  ctx.beginPath();
  signal.forEach((value, index) => {
    const px = x + (index / (signal.length - 1)) * width;
    const py = y + height - ((value - yMin) / yRange) * height;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw legend
  ctx.font = '10px system-ui';
  ctx.fillStyle = '#3b82f6';
  ctx.fillText('MACD', x + 50, y - 5);
  ctx.fillStyle = '#f97316';
  ctx.fillText('Signal', x + 90, y - 5);
}

// Calculate MACD from price data
function calculateMACD(prices: number[]): MACDData {
  const ema12 = calculateEMAArray(prices, 12);
  const ema26 = calculateEMAArray(prices, 26);

  const macd: number[] = [];
  const startIdx = 25; // Start after we have enough data for EMA26

  for (let i = startIdx; i < prices.length; i++) {
    macd.push(ema12[i] - ema26[i]);
  }

  const signal = calculateEMAArray(macd, 9);
  const histogram = macd.map((m, i) => m - (signal[i] || 0));

  return { macd, signal, histogram };
}

function calculateEMAArray(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < prices.length; i++) {
    sum += prices[i];
  }
  ema[period - 1] = sum / period;

  // Calculate EMA for rest
  for (let i = period; i < prices.length; i++) {
    ema[i] = (prices[i] - (ema[i - 1] || prices[i])) * multiplier + (ema[i - 1] || prices[i]);
  }

  // Fill in the beginning with the first calculated EMA
  for (let i = 0; i < period - 1; i++) {
    ema[i] = ema[period - 1] || 0;
  }

  return ema;
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `$${price.toFixed(2)}`;
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr.slice(5, 10); // Fallback: extract MM-DD
  }
}

export default DetailChart;
