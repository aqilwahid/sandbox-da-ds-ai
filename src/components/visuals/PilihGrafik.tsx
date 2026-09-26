import React from 'react';
import { VisualFrame } from './shared';

const W = 120;
const H = 64;
const c1 = 'var(--series-1)';
const grid = 'var(--chart-grid)';

const Mini: Record<string, React.ReactNode> = {
  batang: (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <line x1="8" y1="56" x2="112" y2="56" stroke="var(--chart-axis)" />
      {[36, 22, 44, 14, 30].map((h, i) => (
        <rect key={i} x={14 + i * 20} y={56 - h} width="11" height={h} rx="2" fill={c1} />
      ))}
    </svg>
  ),
  garis: (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {[16, 32, 48].map((y) => (
        <line key={y} x1="8" x2="112" y1={y} y2={y} stroke={grid} />
      ))}
      <path d="M10,46 L28,40 L46,44 L64,28 L82,32 L100,14 L110,18" fill="none" stroke={c1} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="110" cy="18" r="3.5" fill={c1} stroke="var(--chart-surface)" strokeWidth="1.5" />
    </svg>
  ),
  histogram: (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <line x1="8" y1="56" x2="112" y2="56" stroke="var(--chart-axis)" />
      {[6, 14, 26, 38, 30, 20, 12, 7, 4].map((h, i) => (
        <rect key={i} x={12 + i * 11} y={56 - h} width="10" height={h} fill={c1} />
      ))}
    </svg>
  ),
  scatter: (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {[
        [16, 48],
        [26, 44],
        [34, 40],
        [40, 42],
        [50, 34],
        [58, 30],
        [66, 32],
        [74, 22],
        [86, 20],
        [96, 14],
        [104, 16],
        [46, 26],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.2" fill={c1} fillOpacity="0.85" stroke="var(--chart-surface)" strokeWidth="1.2" />
      ))}
    </svg>
  ),
  kotak: (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {[
        [30, 18, 30, 38, 48, 54],
        [60, 10, 22, 30, 40, 50],
        [90, 22, 34, 40, 46, 52],
      ].map(([x, lo, q1, med, q3, hi], i) => (
        <g key={i}>
          <line x1={x} x2={x} y1={lo} y2={hi} stroke="var(--chart-axis)" />
          <rect x={x - 9} y={q1} width="18" height={q3 - q1} rx="2" fill={c1} fillOpacity="0.25" stroke={c1} />
          <line x1={x - 9} x2={x + 9} y1={med} y2={med} stroke={c1} strokeWidth="2" />
        </g>
      ))}
      <circle cx="60" cy="5" r="2.5" fill="var(--series-2)" />
    </svg>
  ),
};

const CATALOG = [
  { id: 'batang', nama: 'Batang', tanya: 'Kategori mana yang paling besar/kecil?', contoh: 'Median harga per lokasi', kode: 'plt.bar / plt.barh' },
  { id: 'garis', nama: 'Garis', tanya: 'Bagaimana trennya dari waktu ke waktu?', contoh: 'Omzet per bulan', kode: 'plt.plot' },
  { id: 'histogram', nama: 'Histogram', tanya: 'Bagaimana sebaran satu variabel angka?', contoh: 'Sebaran harga rumah', kode: 'plt.hist' },
  { id: 'scatter', nama: 'Scatter (titik)', tanya: 'Apakah dua variabel angka berhubungan?', contoh: 'Luas bangunan vs harga', kode: 'plt.scatter' },
  { id: 'kotak', nama: 'Boxplot', tanya: 'Bagaimana sebaran & pencilan per kelompok?', contoh: 'Harga per jenis sertifikat', kode: 'plt.boxplot' },
];

export const PilihGrafik: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const sorot = new Set(((spec.sorot || []) as string[]).map((s) => String(s).toLowerCase()));
  return (
    <VisualFrame kind="Memilih grafik" title={(spec.judul as string) || 'Pertanyaan menentukan jenis grafik'} caption={spec.keterangan as string | undefined}>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
        {CATALOG.map((c) => {
          const on = sorot.size === 0 || sorot.has(c.id);
          return (
            <div
              key={c.id}
              className={`rounded-lg border p-2.5 transition-opacity ${sorot.has(c.id) ? 'border-accent bg-accent/[0.06]' : 'border-line bg-panel2'} ${on ? '' : 'opacity-55'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-fg">{c.nama}</span>
                {sorot.has(c.id) && <span className="rounded-full bg-accent-solid px-1.5 py-px text-[9.5px] font-semibold text-white">dipakai</span>}
              </div>
              <div className="my-1.5 flex justify-center rounded-md bg-panel py-1">{Mini[c.id]}</div>
              <div className="text-2xs leading-snug text-fg">{c.tanya}</div>
              <div className="mt-1 text-[10.5px] text-fg3">Contoh: {c.contoh}</div>
              <code className="mt-1 block font-mono text-[10.5px] text-fg2">{c.kode}</code>
            </div>
          );
        })}
      </div>
    </VisualFrame>
  );
};
