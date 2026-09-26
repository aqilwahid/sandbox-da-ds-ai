import React, { useMemo, useState } from 'react';
import { BarChart3, LineChart as LineIcon, ScatterChart as ScatterIcon, Sparkles } from 'lucide-react';
import type { TableDisplay } from '../../runtime/types';
import { BarChart } from '../charts/BarChart';
import { LineChart } from '../charts/LineChart';
import { ScatterChart } from '../charts/ScatterChart';
import { columnRoles, planChart, type ChartType } from '../charts/chartUtils';

const MAX_BARS = 40;

export const ChartPanel: React.FC<{ table: TableDisplay }> = ({ table }) => {
  const plan = useMemo(() => planChart(table), [table]);
  const roles = useMemo(() => columnRoles(table), [table]);
  const numeric = roles.filter((r) => r.numeric);
  const initialType: ChartType = plan.type === 'line' || plan.type === 'scatter' ? plan.type : 'bar';
  const [type, setType] = useState<ChartType>(initialType);
  const [x, setX] = useState<number>(plan.x >= 0 ? plan.x : roles.find((r) => !r.numeric)?.i ?? 0);
  const [y, setY] = useState<number>(plan.y >= 0 ? plan.y : numeric[0]?.i ?? -1);

  if (!numeric.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 p-8 text-center text-xs text-fg3">
        <Sparkles size={18} />
        Tabel ini tidak punya kolom angka, jadi belum bisa digambar sebagai grafik.
      </div>
    );
  }

  const label = (i: number) => (i >= 0 ? table.columns[i] : '');
  const rows = table.rows;
  let chart: React.ReactNode = null;
  let note = '';
  if (type === 'scatter') {
    const xs = numeric.find((r) => r.i === x) ? x : numeric[0].i;
    const ys = y >= 0 ? y : numeric[Math.min(1, numeric.length - 1)].i;
    const labelCol = roles.find((r) => !r.numeric)?.i;
    const points = rows
      .map((r) => ({ x: r[xs] as number, y: r[ys] as number, label: labelCol !== undefined ? String(r[labelCol] ?? '') : undefined }))
      .filter((p) => typeof p.x === 'number' && typeof p.y === 'number');
    chart = <ScatterChart points={points} xLabel={label(xs)} yLabel={label(ys)} />;
  } else {
    const shown = rows.slice(0, type === 'bar' ? MAX_BARS : 500);
    if (type === 'bar' && rows.length > MAX_BARS) note = `Menampilkan ${MAX_BARS} baris pertama dari ${rows.length}.`;
    const cats = shown.map((r) => String(r[x] ?? '—'));
    const vals = shown.map((r) => (typeof r[y] === 'number' ? (r[y] as number) : null));
    chart =
      type === 'bar' ? (
        <BarChart categories={cats} values={vals} valueLabel={label(y)} categoryLabel={label(x)} />
      ) : (
        <LineChart labels={cats} values={vals} valueLabel={label(y)} />
      );
  }
  if (table.truncated) note = `Grafik memakai ${table.rows.length} baris pertama dari ${table.totalRows}.`;

  const typeBtn = (t: ChartType, icon: React.ReactNode, text: string) => (
    <button
      type="button"
      onClick={() => setType(t)}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-2xs font-medium ${type === t ? 'bg-panel3 text-fg shadow-card' : 'text-fg3 hover:text-fg'}`}
      aria-pressed={type === t}
    >
      {icon}
      {text}
    </button>
  );

  return (
    <div className="space-y-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-line bg-panel2 p-0.5">
          {typeBtn('bar', <BarChart3 size={12} />, 'Batang')}
          {typeBtn('line', <LineIcon size={12} />, 'Garis')}
          {numeric.length >= 2 && typeBtn('scatter', <ScatterIcon size={12} />, 'Titik')}
        </div>
        <label className="flex items-center gap-1 text-2xs text-fg3">
          {type === 'scatter' ? 'X' : 'Label'}
          <select
            className="rounded border border-line bg-panel2 px-1.5 py-1 text-2xs text-fg"
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
          >
            {(type === 'scatter' ? numeric : roles).map((r) => (
              <option key={r.i} value={r.i}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-2xs text-fg3">
          {type === 'scatter' ? 'Y' : 'Nilai'}
          <select
            className="rounded border border-line bg-panel2 px-1.5 py-1 text-2xs text-fg"
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
          >
            {numeric.map((r) => (
              <option key={r.i} value={r.i}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <span className="text-2xs text-fg3">{plan.reason}</span>
      </div>
      <div className="rounded-lg border border-line bg-panel px-2 pt-2">
        <div className="px-1 pb-1 text-xs font-medium text-fg">
          {type === 'scatter' ? `${label(y)} vs ${label(x)}` : `${label(y)} per ${label(x)}`}
        </div>
        {chart}
      </div>
      {note && <p className="text-2xs text-fg3">{note}</p>}
    </div>
  );
};
