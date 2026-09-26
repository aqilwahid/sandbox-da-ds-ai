import React, { useMemo, useState } from 'react';
import { BarChart3, Check, Copy, Download, LayoutGrid, Table2 } from 'lucide-react';
import { copyText, downloadText, formatNumber, toCsv } from '../../lib/format';
import type { TableDisplay } from '../../runtime/types';
import { planChart } from '../charts/chartUtils';
import { ChartPanel } from './ChartPanel';
import { DataTable } from './DataTable';
import { KpiTiles } from './KpiTiles';

type View = 'table' | 'chart' | 'kpi';

export const TableCard: React.FC<{ table: TableDisplay; defaultView?: View; maxHeight?: number; label?: string }> = ({
  table,
  defaultView,
  maxHeight = 340,
  label,
}) => {
  const plan = useMemo(() => planChart(table), [table]);
  const [view, setView] = useState<View>(defaultView ?? (plan.type === 'kpi' ? 'kpi' : 'table'));
  const [copied, setCopied] = useState(false);
  const canChart = plan.type !== 'none' && plan.type !== 'kpi';
  const canKpi = table.rows.length === 1;

  const csv = () => toCsv(table.columns, table.rows);
  const btn = (v: View, icon: React.ReactNode, text: string) => (
    <button
      type="button"
      onClick={() => setView(v)}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-2xs font-medium transition-colors ${
        view === v ? 'bg-panel3 text-fg shadow-card' : 'text-fg3 hover:text-fg'
      }`}
      aria-pressed={view === v}
    >
      {icon}
      {text}
    </button>
  );

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-panel shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel2 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Table2 size={13} className="shrink-0 text-accent" />
          <span className="truncate text-xs font-semibold text-fg">{table.title || label || 'Tabel'}</span>
          <span className="chip tabular">
            {table.truncated
              ? `${formatNumber(table.rows.length)} dari ${formatNumber(table.totalRows)} baris`
              : `${formatNumber(table.totalRows)} baris`}{' '}
            × {table.columns.length} kolom
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-md border border-line bg-panel p-0.5">
            {btn('table', <Table2 size={12} />, 'Tabel')}
            {canChart && btn('chart', <BarChart3 size={12} />, 'Grafik')}
            {canKpi && btn('kpi', <LayoutGrid size={12} />, 'KPI')}
          </div>
          <button
            type="button"
            className="btn-ghost !px-1.5"
            title="Salin sebagai CSV (bisa ditempel ke Excel/Sheets)"
            onClick={async () => {
              if (await copyText(csv())) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
          >
            {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
          </button>
          <button
            type="button"
            className="btn-ghost !px-1.5"
            title="Unduh CSV"
            onClick={() => downloadText(`${(table.title || 'hasil').toLowerCase().replace(/\s+/g, '_')}.csv`, csv(), 'text/csv')}
          >
            <Download size={13} />
          </button>
        </div>
      </header>
      {view === 'table' && <DataTable table={table} maxHeight={maxHeight} />}
      {view === 'chart' && canChart && <ChartPanel table={table} />}
      {view === 'kpi' && canKpi && <KpiTiles table={table} />}
      {view === 'table' && canChart && table.rows.length > 1 && table.rows.length <= 60 && (
        <button
          type="button"
          onClick={() => setView('chart')}
          className="flex w-full items-center justify-center gap-1.5 border-t border-line bg-panel2/60 py-1.5 text-2xs font-medium text-accent hover:bg-panel3"
        >
          <BarChart3 size={12} /> Lihat sebagai grafik — {plan.reason.toLowerCase()}
        </button>
      )}
    </section>
  );
};
