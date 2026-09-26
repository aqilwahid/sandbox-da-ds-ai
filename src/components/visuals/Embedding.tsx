import React, { useMemo, useState } from 'react';
import { useElementWidth } from '../charts/chartUtils';
import { ResponsiveGrid, VisualFrame } from './shared';

interface Titik {
  teks: string;
  x: number;
  y: number;
  grup?: string;
}

const cos = (a: Titik, b: Titik) => {
  const d = a.x * b.x + a.y * b.y;
  const n = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y);
  return n ? d / n : 0;
};

export const Embedding: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const pts = ((spec.titik || []) as Titik[]).filter((p) => p && typeof p.x === 'number' && typeof p.y === 'number');
  const groups = useMemo(() => [...new Set(pts.map((p) => p.grup || 'Umum'))], [pts]);
  const [q, setQ] = useState(Math.min(pts.length - 1, Math.max(0, Number(spec.query ?? 0))));
  const [ref, width] = useElementWidth<HTMLDivElement>();
  if (!pts.length) return null;
  const query = pts[q];
  const ranked = pts
    .map((p, i) => ({ p, i, s: cos(query, p) }))
    .filter((r) => r.i !== q)
    .sort((a, b) => b.s - a.s);
  const maxV = Math.max(1, ...pts.map((p) => Math.max(p.x, p.y))) * 1.08;
  const size = Math.min(width || 300, 320);
  const pad = 22;
  const sx = (v: number) => pad + (v / maxV) * (size - pad * 2);
  const sy = (v: number) => size - pad - (v / maxV) * (size - pad * 2);
  const color = (g?: string) => `var(--series-${(groups.indexOf(g || 'Umum') % 8) + 1})`;
  const nearest = ranked[0];
  const angle = (p: Titik) => Math.atan2(p.y, p.x);
  const arc = (() => {
    if (!nearest) return '';
    const r = 38;
    const a1 = angle(query);
    const a2 = angle(nearest.p);
    const x1 = sx(0) + r * Math.cos(a1);
    const y1 = sy(0) - r * Math.sin(a1);
    const x2 = sx(0) + r * Math.cos(a2);
    const y2 = sy(0) - r * Math.sin(a2);
    return `M${x1},${y1} A${r},${r} 0 0 ${a2 > a1 ? 0 : 1} ${x2},${y2}`;
  })();

  return (
    <VisualFrame
      kind="Ruang embedding"
      title={(spec.judul as string) || 'Teks yang maknanya mirip → vektor yang arahnya mirip'}
      caption={(spec.keterangan as string) || 'Klik sebuah titik untuk menjadikannya kueri. Cosine similarity mengukur kemiripan ARAH dua vektor (1 = searah/sangat mirip, 0 = tegak lurus/tidak berhubungan).'}
    >
      <ResponsiveGrid min={600} wide="grid-cols-[auto_minmax(0,1fr)]" className="gap-3">
        <div ref={ref} className="min-w-[220px]">
          {width > 0 && (
            <svg width={size} height={size} role="img" aria-label="Diagram vektor embedding 2 dimensi">
              <line x1={sx(0)} y1={sy(0)} x2={sx(maxV)} y2={sy(0)} stroke="var(--chart-axis)" />
              <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(maxV)} stroke="var(--chart-axis)" />
              {pts.map((p, i) => (
                <line
                  key={`v${i}`}
                  x1={sx(0)}
                  y1={sy(0)}
                  x2={sx(p.x)}
                  y2={sy(p.y)}
                  stroke={color(p.grup)}
                  strokeWidth={i === q ? 2.5 : 1}
                  strokeOpacity={i === q || i === nearest?.i ? 0.95 : 0.25}
                />
              ))}
              {arc && <path d={arc} fill="none" stroke="rgb(var(--c-fg2))" strokeWidth="1.5" />}
              {pts.map((p, i) => (
                <g key={i} onClick={() => setQ(i)} style={{ cursor: 'pointer' }}>
                  <circle cx={sx(p.x)} cy={sy(p.y)} r="12" fill="transparent" />
                  <circle cx={sx(p.x)} cy={sy(p.y)} r={i === q ? 6.5 : 4.5} fill={color(p.grup)} stroke="var(--chart-surface)" strokeWidth="2" />
                  <title>{p.teks}</title>
                </g>
              ))}
            </svg>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            {groups.map((g) => (
              <span key={g} className="flex items-center gap-1 text-2xs text-fg2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color(g) }} /> {g}
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <div className="rounded-lg border border-accent/50 bg-accent/[0.06] px-3 py-2">
            <div className="text-2xs font-semibold uppercase tracking-wide text-fg3">Kueri</div>
            <div className="text-sm text-fg">"{query.teks}"</div>
          </div>
          <ol className="mt-2 space-y-1">
            {ranked.map((r, k) => (
              <li key={r.i}>
                <button type="button" onClick={() => setQ(r.i)} className="grid w-full grid-cols-[1fr_120px] items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-panel3">
                  <span className="flex min-w-0 items-center gap-1.5 text-xs text-fg">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color(r.p.grup) }} />
                    <span className="truncate">
                      {k === 0 && <strong className="mr-1 text-ok">terdekat</strong>}
                      {r.p.teks}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel3">
                      <span className="block h-full rounded-full" style={{ width: `${Math.max(0, r.s) * 100}%`, background: 'var(--series-1)' }} />
                    </span>
                    <span className="w-9 text-right font-mono text-2xs text-fg tabular">{r.s.toFixed(2)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </ResponsiveGrid>
    </VisualFrame>
  );
};
