import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatPercent } from '../../lib/format';
import { ResponsiveGrid, VisualFrame } from './shared';

type Cell = 'tp' | 'fp' | 'fn' | 'tn';
const METRICS: { id: string; nama: string; rumus: string; cells: Cell[]; calc: (c: Record<Cell, number>) => number | null; arti: string }[] = [
  { id: 'akurasi', nama: 'Akurasi', rumus: '(TP + TN) / semua', cells: ['tp', 'tn'], calc: (c) => (c.tp + c.tn) / Math.max(1, c.tp + c.tn + c.fp + c.fn), arti: 'Berapa persen tebakan yang benar secara keseluruhan.' },
  { id: 'presisi', nama: 'Presisi', rumus: 'TP / (TP + FP)', cells: ['tp', 'fp'], calc: (c) => (c.tp + c.fp ? c.tp / (c.tp + c.fp) : null), arti: 'Dari yang DIPREDIKSI positif, berapa yang benar-benar positif.' },
  { id: 'recall', nama: 'Recall', rumus: 'TP / (TP + FN)', cells: ['tp', 'fn'], calc: (c) => (c.tp + c.fn ? c.tp / (c.tp + c.fn) : null), arti: 'Dari yang SEBENARNYA positif, berapa yang berhasil ditemukan.' },
  {
    id: 'f1',
    nama: 'F1-score',
    rumus: '2 × P × R / (P + R)',
    cells: ['tp', 'fp', 'fn'],
    calc: (c) => {
      const p = c.tp + c.fp ? c.tp / (c.tp + c.fp) : 0;
      const r = c.tp + c.fn ? c.tp / (c.tp + c.fn) : 0;
      return p + r ? (2 * p * r) / (p + r) : null;
    },
    arti: 'Rata-rata harmonis presisi & recall — seimbang di antara keduanya.',
  },
];

export const ConfusionMatrix: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const pos = String(spec.label_positif || 'Positif');
  /** urutan: sklearn → susunan [[TN, FP], [FN, TP]] seperti output scikit-learn (baris = aktual, kolom = prediksi). */
  const sk = String(spec.urutan || '').toLowerCase() === 'sklearn';
  const neg = String(spec.label_negatif || 'Negatif');
  const [c, setC] = useState<Record<Cell, number>>({
    tp: Number(spec.tp ?? 40),
    fp: Number(spec.fp ?? 10),
    fn: Number(spec.fn ?? 15),
    tn: Number(spec.tn ?? 85),
  });
  const [hover, setHover] = useState<string | null>(null);
  const hiCells = new Set(METRICS.find((m) => m.id === hover)?.cells || []);
  const bump = (k: Cell, d: number) => setC((s) => ({ ...s, [k]: Math.max(0, s[k] + d) }));

  const cellBox = (k: Cell, name: string, desc: string, good: boolean) => (
    <div
      key={k}
      className={`relative rounded-lg border p-2.5 transition-all ${hiCells.has(k) ? 'border-accent ring-2 ring-accent/40' : 'border-line'}`}
      style={{ background: good ? 'rgb(var(--c-ok) / 0.10)' : 'rgb(var(--c-err) / 0.08)' }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xs font-bold text-fg2">{name}</span>
        <span className="flex gap-0.5">
          <button type="button" className="rounded p-0.5 text-fg3 hover:bg-panel3 hover:text-fg" onClick={() => bump(k, -1)} aria-label={`Kurangi ${name}`}>
            <Minus size={11} />
          </button>
          <button type="button" className="rounded p-0.5 text-fg3 hover:bg-panel3 hover:text-fg" onClick={() => bump(k, 1)} aria-label={`Tambah ${name}`}>
            <Plus size={11} />
          </button>
        </span>
      </div>
      <div className="text-2xl font-semibold text-fg tabular">{c[k]}</div>
      <div className="text-[10.5px] leading-tight text-fg2">{desc}</div>
    </div>
  );

  return (
    <VisualFrame kind="Confusion matrix" title={(spec.judul as string) || 'Membaca hasil model klasifikasi'} caption={spec.keterangan as string | undefined}>
      <ResponsiveGrid min={660} wide="grid-cols-2" className="gap-4">
        <div>
          <div className="mb-1 ml-[76px] grid grid-cols-2 gap-2 text-center text-2xs font-semibold text-fg2">
            <div>Prediksi: {sk ? neg : pos}</div>
            <div>Prediksi: {sk ? pos : neg}</div>
          </div>
          <div className="grid grid-cols-[70px_1fr_1fr] items-stretch gap-2">
            {sk ? (
              <>
                <div className="flex items-center text-2xs font-semibold text-fg2">Aktual: {neg}</div>
                {cellBox('tn', 'TN', `Benar ditebak ${neg}`, true)}
                {cellBox('fp', 'FP', `Alarm palsu (${neg} ditebak ${pos})`, false)}
                <div className="flex items-center text-2xs font-semibold text-fg2">Aktual: {pos}</div>
                {cellBox('fn', 'FN', `${pos} yang terlewat`, false)}
                {cellBox('tp', 'TP', `Benar ditebak ${pos}`, true)}
              </>
            ) : (
              <>
                <div className="flex items-center text-2xs font-semibold text-fg2">Aktual: {pos}</div>
                {cellBox('tp', 'TP', `Benar ditebak ${pos}`, true)}
                {cellBox('fn', 'FN', `${pos} yang terlewat`, false)}
                <div className="flex items-center text-2xs font-semibold text-fg2">Aktual: {neg}</div>
                {cellBox('fp', 'FP', `Alarm palsu (${neg} ditebak ${pos})`, false)}
                {cellBox('tn', 'TN', `Benar ditebak ${neg}`, true)}
              </>
            )}
          </div>
          <p className="mt-2 text-2xs text-fg3">
            {sk ? 'Susunan ini sama dengan ' : 'Catatan: '}
            <code className="font-mono">sklearn.metrics.confusion_matrix</code>
            {sk ? ': baris = aktual, kolom = prediksi, label diurutkan [0, 1] → ' : ' mengurutkan label [0, 1], sehingga susunannya '}
            <code className="font-mono">[[TN, FP], [FN, TP]]</code>.
          </p>
        </div>
        <div className="space-y-1.5">
          {METRICS.map((m) => {
            const v = m.calc(c);
            return (
              <div
                key={m.id}
                onMouseEnter={() => setHover(m.id)}
                onMouseLeave={() => setHover(null)}
                className={`rounded-lg border px-3 py-2 transition-colors ${hover === m.id ? 'border-accent bg-accent/[0.06]' : 'border-line bg-panel2'}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-fg">{m.nama}</span>
                  <span className="text-lg font-semibold text-fg tabular">{v === null ? '—' : formatPercent(v, 1)}</span>
                </div>
                <div className="font-mono text-[10.5px] text-fg3">{m.rumus}</div>
                <div className="text-2xs text-fg2">{m.arti}</div>
              </div>
            );
          })}
        </div>
      </ResponsiveGrid>
    </VisualFrame>
  );
};
