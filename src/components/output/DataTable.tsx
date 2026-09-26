import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { formatCell } from '../../lib/format';
import type { CellValue, ColumnKind } from '../../runtime/types';

export interface GenericTable {
  columns: string[];
  kinds: ColumnKind[];
  rows: CellValue[][];
  indexColumns?: number;
  dtypes?: string[];
  source?: string;
}

interface Props {
  table: GenericTable;
  maxHeight?: number | string;
  filterable?: boolean;
  nullLabel?: string;
  compact?: boolean;
  descriptions?: Record<string, string>;
}

function nullLabelFor(source?: string) {
  if (source === 'sql') return 'NULL';
  if (source === 'dataframe') return 'NaN';
  if (source === 'csv') return '(kosong)';
  return 'None';
}

export const DataTable: React.FC<Props> = ({ table, maxHeight = 360, filterable = true, nullLabel, compact, descriptions }) => {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [q, setQ] = useState('');
  const nl = nullLabel ?? nullLabelFor(table.source);
  const idxCols = table.indexColumns || 0;

  const rows = useMemo(() => {
    let out = table.rows.map((r, i) => ({ r, i }));
    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter(({ r }) => r.some((c) => c !== null && String(c).toLowerCase().includes(needle)));
    }
    if (sort) {
      const { col, dir } = sort;
      out = [...out].sort((a, b) => {
        const x = a.r[col];
        const y = b.r[col];
        if (x === y) return 0;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
        return String(x).localeCompare(String(y), 'id') * dir;
      });
    }
    return out;
  }, [table.rows, q, sort]);

  const toggleSort = (i: number) =>
    setSort((s) => (!s || s.col !== i ? { col: i, dir: 1 } : s.dir === 1 ? { col: i, dir: -1 } : null));

  return (
    <div className="flex min-h-0 flex-col">
      {filterable && table.rows.length > 8 && (
        <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
          <Search size={12} className="text-fg3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari di tabel…"
            className="w-full bg-transparent text-xs text-fg placeholder:text-fg3 focus:outline-none"
            aria-label="Cari di tabel"
          />
          {q && <span className="shrink-0 text-2xs text-fg3">{rows.length} cocok</span>}
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className={`w-full border-collapse text-left font-mono ${compact ? 'text-2xs' : 'text-xs'}`}>
          <thead className="sticky top-0 z-10 bg-panel2">
            <tr>
              <th className="w-9 border-b border-line px-2 py-1.5 text-right text-2xs font-normal text-fg3">#</th>
              {table.columns.map((c, i) => {
                const active = sort?.col === i;
                const isIdx = i < idxCols;
                return (
                  <th
                    key={i}
                    className={`cursor-pointer select-none whitespace-nowrap border-b border-line px-2.5 py-1.5 font-sans text-2xs font-semibold hover:bg-panel3 ${
                      isIdx ? 'text-fg3' : 'text-fg'
                    } ${table.kinds[i] === 'number' ? 'text-right' : ''}`}
                    onClick={() => toggleSort(i)}
                    title={descriptions?.[c] ? `${c}: ${descriptions[c]}` : `Urutkan menurut ${c}`}
                    aria-sort={active ? (sort!.dir === 1 ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="inline-flex items-center gap-1">
                      {isIdx && <span className="rounded bg-panel3 px-1 text-[9px] font-medium uppercase tracking-wide text-fg3">index</span>}
                      {c}
                      {active ? (sort!.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={10} className="opacity-30" />}
                    </span>
                    {table.dtypes?.[i] && table.dtypes[i] !== 'index' && (
                      <span className="block text-[9.5px] font-normal text-fg3">{table.dtypes[i].toLowerCase()}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, i }) => (
              <tr key={i} className="border-b border-line/60 hover:bg-panel3/60">
                <td className="px-2 py-1 text-right text-2xs text-fg3 tabular">{i + 1}</td>
                {r.map((c, ci) => {
                  const kind = table.kinds[ci];
                  const isNull = c === null || c === undefined;
                  return (
                    <td
                      key={ci}
                      className={`whitespace-nowrap px-2.5 py-1 ${ci < idxCols ? 'bg-panel2/60 font-medium text-fg2' : 'text-fg'} ${
                        kind === 'number' ? 'text-right tabular' : ''
                      }`}
                    >
                      {isNull ? <span className="italic text-fg3/80">{nl}</span> : formatCell(c, kind)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={table.columns.length + 1} className="p-5 text-center font-sans text-xs text-fg3">
                  {table.rows.length ? 'Tidak ada baris yang cocok.' : 'Tabel kosong (0 baris).'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
