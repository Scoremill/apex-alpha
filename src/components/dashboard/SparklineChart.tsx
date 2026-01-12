'use client';

import { useEffect, useRef } from 'react';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  lineWidth?: number;
}

export function SparklineChart({
  data,
  width = 200,
  height = 60,
  color = '#22c55e',
  fillColor,
  lineWidth = 2,
}: SparklineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up for retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate min/max for scaling
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Add padding
    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Calculate points
    const points: { x: number; y: number }[] = data.map((value, index) => ({
      x: padding + (index / (data.length - 1)) * chartWidth,
      y: padding + chartHeight - ((value - min) / range) * chartHeight,
    }));

    // Draw fill gradient if specified
    if (fillColor) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.moveTo(points[0].x, height);
      points.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(points[points.length - 1].x, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Use quadratic curves for smooth line
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    // Last point
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

  }, [data, width, height, color, fillColor, lineWidth]);

  if (data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-slate-600 text-xs"
      >
        No data
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

// Determine color based on price change
export function getSparklineColor(data: number[]): string {
  if (data.length < 2) return '#64748b'; // slate-500
  const first = data[0];
  const last = data[data.length - 1];
  return last >= first ? '#22c55e' : '#ef4444'; // green-500 or red-500
}

export function getSparklineFillColor(data: number[]): string {
  if (data.length < 2) return 'rgba(100, 116, 139, 0.1)';
  const first = data[0];
  const last = data[data.length - 1];
  return last >= first ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
}

export default SparklineChart;
