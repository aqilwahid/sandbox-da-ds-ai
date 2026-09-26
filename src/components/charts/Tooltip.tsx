import React from 'react';

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Tooltip grafik: nilai tebal di depan, label sekunder di belakang. */
export const ChartTooltip: React.FC<{ x: number; y: number; title?: string; rows: TooltipRow[]; containerWidth: number }> = ({
  x,
  y,
  title,
  rows,
  containerWidth,
}) => {
  const flip = x > containerWidth - 190;
  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[120px] max-w-[240px] rounded-lg border border-line2 bg-panel2/95 px-2.5 py-2 text-2xs shadow-pop backdrop-blur"
      style={{ left: flip ? undefined : x + 14, right: flip ? containerWidth - x + 14 : undefined, top: Math.max(0, y - 10) }}
      role="status"
    >
      {title && <div className="mb-1 truncate font-medium text-fg2">{title}</div>}
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 whitespace-nowrap">
          {r.color && <span className="inline-block h-0.5 w-3 rounded" style={{ background: r.color }} />}
          <span className="tabular font-semibold text-fg">{r.value}</span>
          <span className="truncate text-fg3">{r.label}</span>
        </div>
      ))}
    </div>
  );
};
