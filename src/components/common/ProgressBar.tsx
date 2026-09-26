import React from 'react';

export const ProgressBar: React.FC<{ value: number | null; label?: string; tone?: 'accent' | 'ok' }> = ({ value, label, tone = 'accent' }) => {
  const indeterminate = value === null;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex items-center justify-between gap-2 text-2xs text-fg2">
          <span className="truncate">{label}</span>
          {!indeterminate && <span className="tabular text-fg3">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel3" role="progressbar" aria-valuenow={indeterminate ? undefined : pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-full rounded-full ${tone === 'ok' ? 'bg-ok' : 'bg-accent'} ${indeterminate ? 'w-1/3 animate-pulse-soft' : 'transition-[width] duration-300'}`}
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
