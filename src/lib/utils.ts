import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(num: number): string {
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

// Smart currency formatter for crypto that handles sub-penny values
export function formatCryptoCurrency(num: number): string {
  if (num === 0) return '$0.00';

  // For values >= $1, use standard 2 decimal formatting
  if (num >= 1) {
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // For values between $0.01 and $1, use 4 decimals
  if (num >= 0.01) {
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }

  // For values between $0.0001 and $0.01, use 6 decimals
  if (num >= 0.0001) {
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    });
  }

  // For very small values (sub 0.0001), use 8 decimals
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  });
}

export function formatPercent(num: number): string {
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function formatVolume(num: number): string {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  }
  return num.toString();
}

export function getChangeColor(change: number): string {
  if (change > 0) return 'text-green-500';
  if (change < 0) return 'text-red-500';
  return 'text-slate-400';
}

export function getChangeColorBg(change: number): string {
  if (change > 0) return 'bg-green-500/10 text-green-500';
  if (change < 0) return 'bg-red-500/10 text-red-500';
  return 'bg-slate-500/10 text-slate-400';
}
