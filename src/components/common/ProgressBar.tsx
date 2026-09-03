import React from 'react';

interface ProgressBarProps {
  percentage: number;
  message: string;
  isIndeterminate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  message,
  isIndeterminate = false,
}) => {
  const clampedPct = Math.min(100, Math.max(0, percentage));

  return (
    <div className="w-full bg-dark-850 border border-slate-800 rounded-lg p-3.5 shadow-lg">
      <div className="flex items-center justify-between text-xs font-mono mb-2">
        <span className="text-slate-300 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          {message || 'Memuat runtime...'}
        </span>
        <span className="text-brand-400 font-semibold">{clampedPct}%</span>
      </div>

      <div className="w-full bg-dark-950 rounded-full h-2 overflow-hidden border border-slate-800/80">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isIndeterminate
              ? 'w-1/3 bg-gradient-to-r from-brand-500 via-cyan-400 to-brand-500 animate-[shimmer_1.5s_infinite]'
              : 'bg-gradient-to-r from-indigo-500 via-brand-400 to-cyan-400'
          }`}
          style={{ width: isIndeterminate ? undefined : `${clampedPct}%` }}
        />
      </div>
    </div>
  );
};
