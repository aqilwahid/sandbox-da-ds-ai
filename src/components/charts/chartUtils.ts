import { useEffect, useRef, useState } from 'react';
import { formatCompact, formatNumber, isDateLike } from '../../lib/format';
import type { TableDisplay } from '../../runtime/types';

export const seriesColor = (i: number) => `var(--series-${(i % 8) + 1})`;

/** Tick "cantik" (0, 50, 100 …) untuk sumbu angka. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) {
    const pad = Math.abs(min) || 1;
    min -= pad;
    max += pad;
  }
  const span = max - min;
  const step0 = span / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step * 0.5; v += step) ticks.push(Math.round(v / step) * step);
  return ticks;
}

export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = Math.floor(entries[0].contentRect.width);
      setW((prev) => (Math.abs(prev - cw) > 1 ? cw : prev));
    });
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export const axisFormat = (v: number) => formatCompact(v);
export const valueFormat = (v: number) => formatNumber(v, Number.isInteger(v) ? 0 : 2);

/** Perkiraan lebar teks (px) tanpa mengukur DOM. */
export function textWidth(s: string, px = 11): number {
  return s.length * px * 0.58;
}

export function truncateLabel(s: string, maxPx: number, px = 11): string {
  if (textWidth(s, px) <= maxPx) return s;
  const n = Math.max(3, Math.floor(maxPx / (px * 0.58)) - 1);
  return s.slice(0, n) + '…';
}

// ---------------------------------------------------------------------------
// Pemilihan grafik otomatis untuk tabel hasil
// ---------------------------------------------------------------------------

export type ChartType = 'bar' | 'line' | 'scatter';
export interface ChartPlan {
  type: ChartType | 'kpi' | 'none';
  x: number;
  y: number;
  reason: string;
}

const EXCLUDE_MEASURE = /^(id|id_.*|.*_id|peringkat|rank|rn|no|nomor|tahun|index|kode.*)$/i;
const PREFER_MEASURE = /(omzet|total|nilai|jumlah|harga|pendapatan|count|mean|median|rata|sum|persen|skor|akurasi|ongkir|stok|n$)/i;

export function columnRoles(t: TableDisplay) {
  const n = t.rows.length;
  const roles = t.columns.map((name, i) => {
    const values = t.rows.map((r) => r[i]);
    const filled = values.filter((v) => v !== null && v !== undefined);
    const kind = t.kinds[i];
    const temporal =
      kind === 'date' || (kind === 'text' && filled.length > 0 && filled.filter((v) => isDateLike(v)).length / filled.length >= 0.9);
    const unique = new Set(filled.map(String)).size;
    return {
      i,
      name,
      kind,
      numeric: kind === 'number',
      temporal,
      categorical: kind === 'text' || kind === 'bool',
      uniqueRatio: n ? unique / n : 0,
      unique,
    };
  });
  return roles;
}

export function planChart(t: TableDisplay): ChartPlan {
  const roles = columnRoles(t);
  const numeric = roles.filter((r) => r.numeric);
  const measures = numeric.filter((r) => !EXCLUDE_MEASURE.test(r.name));
  const pickMeasure = () => {
    const pool = measures.length ? measures : numeric;
    const preferred = [...pool].reverse().find((r) => PREFER_MEASURE.test(r.name));
    return (preferred || pool[pool.length - 1])?.i ?? -1;
  };
  if (!t.rows.length) return { type: 'none', x: -1, y: -1, reason: 'Tabel kosong' };
  if (t.rows.length === 1 && numeric.length >= 1) return { type: 'kpi', x: -1, y: numeric[0].i, reason: 'Satu baris angka → kartu KPI' };
  const temporal = roles.find((r) => r.temporal);
  if (temporal && numeric.length) {
    return { type: 'line', x: temporal.i, y: pickMeasure(), reason: 'Ada kolom waktu → grafik garis untuk melihat tren' };
  }
  const cats = roles.filter((r) => r.categorical && !r.temporal);
  if (cats.length && numeric.length) {
    const best = [...cats].sort((a, b) => b.uniqueRatio - a.uniqueRatio)[0];
    return { type: 'bar', x: best.i, y: pickMeasure(), reason: 'Kategori + angka → grafik batang untuk membandingkan' };
  }
  if (numeric.length >= 2) {
    return { type: 'scatter', x: numeric[0].i, y: numeric[1].i, reason: 'Dua kolom angka → scatter untuk melihat hubungan' };
  }
  return { type: 'none', x: -1, y: -1, reason: 'Belum ada kombinasi kolom yang cocok untuk grafik' };
}
