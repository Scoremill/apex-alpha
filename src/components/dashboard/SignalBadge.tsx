'use client';

import { cn } from '@/lib/utils';
import { getSignalColor } from '@/lib/signal-engine';
import type { SignalAction } from '@/types';

interface SignalBadgeProps {
  action: SignalAction;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
  showConfidence?: boolean;
}

export function SignalBadge({
  action,
  confidence,
  size = 'md',
  showConfidence = false,
}: SignalBadgeProps) {
  const colors = getSignalColor(action);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const actionLabels: Record<SignalAction, string> = {
    STRONG_BUY: 'Strong Buy',
    ACCUMULATE: 'Accumulate',
    HOLD: 'Hold',
    EXIT: 'Exit',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center font-semibold rounded-md border',
          colors.bg,
          colors.text,
          colors.border,
          sizeClasses[size]
        )}
      >
        {actionLabels[action]}
      </span>
      {showConfidence && confidence !== undefined && (
        <span className="text-xs text-slate-500">
          {confidence}%
        </span>
      )}
    </div>
  );
}

// Compact version for cards
export function SignalDot({ action }: { action: SignalAction }) {
  const colors = getSignalColor(action);

  return (
    <div
      className={cn(
        'h-2 w-2 rounded-full',
        action === 'STRONG_BUY' && 'bg-green-500',
        action === 'ACCUMULATE' && 'bg-emerald-500',
        action === 'HOLD' && 'bg-yellow-500',
        action === 'EXIT' && 'bg-red-500'
      )}
    />
  );
}

export default SignalBadge;
