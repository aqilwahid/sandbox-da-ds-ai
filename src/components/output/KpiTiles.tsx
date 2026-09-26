import React from 'react';
import { formatCompact, formatNumber } from '../../lib/format';
import type { TableDisplay } from '../../runtime/types';

function humanize(name: string) {
  const s = name.replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Satu baris hasil → kartu KPI (seperti di dashboard). */
export const KpiTiles: React.FC<{ table: TableDisplay }> = ({ table }) => {
  const row = table.rows[0] || [];
  return (
    <div className="grid gap-2.5 p-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
      {table.columns.map((c, i) => {
        const v = row[i];
        const isNum = typeof v === 'number';
        return (
          <div key={i} className="rounded-lg border border-line bg-panel2 px-3 py-2.5">
            <div className="truncate text-2xs font-medium text-fg3" title={c}>
              {humanize(c)}
            </div>
            <div className="mt-1 truncate text-xl font-semibold tracking-tight text-fg">
              {v === null || v === undefined ? '—' : isNum ? formatNumber(v as number, 2) : String(v)}
            </div>
            {isNum && Math.abs(v as number) >= 100000 && (
              <div className="text-2xs text-fg3">≈ {formatCompact(v as number)}</div>
            )}
            <div className="mt-0.5 font-mono text-[10px] text-fg3/80">{c}</div>
          </div>
        );
      })}
    </div>
  );
};
