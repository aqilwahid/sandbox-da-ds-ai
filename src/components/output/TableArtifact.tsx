import React, { useState } from 'react';
import { Table as TableIcon, ArrowUpDown, Search } from 'lucide-react';
import type { TableArtifactData } from '../../runtime/types';

interface TableArtifactProps {
  data: TableArtifactData;
  title?: string;
}

export const TableArtifact: React.FC<TableArtifactProps> = ({ data, title }) => {
  const [filter, setFilter] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const columns = data.columns || [];
  let rows = data.rows || [];

  if (filter.trim()) {
    const q = filter.toLowerCase();
    rows = rows.filter((row) =>
      row.some((cell) => String(cell ?? '').toLowerCase().includes(q))
    );
  }

  if (sortCol !== null) {
    rows = [...rows].sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const res = valA > valB ? 1 : -1;
      return sortAsc ? res : -res;
    });
  }

  const handleSort = (idx: number) => {
    if (sortCol === idx) {
      if (sortAsc) setSortAsc(false);
      else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(idx);
      setSortAsc(true);
    }
  };

  const formatCell = (val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-600 italic">null</span>;
    if (typeof val === 'number') {
      return <span className="text-cyan-300 font-mono">{val.toLocaleString('id-ID')}</span>;
    }
    if (typeof val === 'boolean') {
      return <span className={val ? 'text-emerald-400' : 'text-rose-400'}>{String(val)}</span>;
    }
    return String(val);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden text-xs">
      {/* Table Header Controls */}
      <div className="px-3 py-2 bg-dark-950/80 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <TableIcon size={14} className="text-cyan-400" />
          <span className="font-semibold text-slate-200">{title || 'Data Output Table'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-850 border border-slate-800 font-mono text-slate-400">
            {rows.length} baris
          </span>
        </div>

        {/* Quick Filter */}
        <div className="relative max-w-xs">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Saring baris..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-36 sm:w-44 bg-dark-900 border border-slate-800 rounded pl-6 pr-2 py-0.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse font-mono">
          <thead className="sticky top-0 bg-dark-850 text-slate-300 border-b border-slate-750 select-none z-10">
            <tr>
              <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 w-10 text-center">#</th>
              {columns.map((col, idx) => (
                <th
                  key={col}
                  onClick={() => handleSort(idx)}
                  className="px-3 py-2 text-[11px] font-semibold hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col}</span>
                    <ArrowUpDown size={11} className={sortCol === idx ? 'text-brand-400' : 'text-slate-600'} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-dark-950">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-3 py-1.5 text-center text-slate-600 text-[10px]">{rIdx + 1}</td>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-1.5 text-slate-300 whitespace-nowrap">
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="p-6 text-center text-slate-500 italic">
                  Tidak ada data untuk ditampilkan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
