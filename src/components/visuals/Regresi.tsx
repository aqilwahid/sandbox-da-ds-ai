import React, { useMemo, useState } from 'react';
import { formatNumber } from '../../lib/format';
import { niceTicks, useElementWidth } from '../charts/chartUtils';
import { ResponsiveGrid, VisualFrame } from './shared';

const DEFAULT_POINTS: [number, number][] = [
  [36, 610], [45, 700], [54, 890], [60, 820], [70, 1150], [78, 1080], [90, 1560], [100, 1420], [120, 2100], [135, 1980], [150, 2480],
];

export const Regresi: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const pts = ((spec.titik as [number, number][]) || DEFAULT_POINTS).filter((p) => Array.isArray(p) && p.length >= 2).map(([x, y]) => [Number(x), Number(y)] as [number, number]);
  const xLabel = String(spec.x_label || 'x');
  const yLabel = String(spec.y_label || 'y');
  const ols = useMemo(() => {
    const n = pts.length;
    const mx = pts.reduce((s, p) => s + p[0], 0) / n;
    const my = pts.reduce((s, p) => s + p[1], 0) / n;
    const sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
    const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0) || 1;
    const m = sxy / sxx;
    return { m, b: my - m * mx, my };
  }, [pts]);
  const mRange = Math.max(Math.abs(ols.m) * 2, 1e-6);
  const [m, setM] = useState(ols.m * 0.35);
  const [b, setB] = useState(ols.my * 0.8);
  const [ref, width] = useElementWidth<HTMLDivElement>();

  const mse = pts.reduce((s, [x, y]) => s + (y - (m * x + b)) ** 2, 0) / pts.length;
  const mae = pts.reduce((s, [x, y]) => s + Math.abs(y - (m * x + b)), 0) / pts.length;
  const bestMae = pts.reduce((s, [x, y]) => s + Math.abs(y - (ols.m * x + ols.b)), 0) / pts.length;
  const bestMse = pts.reduce((s, [x, y]) => s + (y - (ols.m * x + ols.b)) ** 2, 0) / pts.length;

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const xt = niceTicks(Math.min(...xs, 0), Math.max(...xs), 5);
  const yt = niceTicks(Math.min(...ys, 0), Math.max(...ys) * 1.1, 5);
  const H = 260;
  const L = 52;
  const R = 12;
  const T = 10;
  const B = 36;
  const pw = Math.max(60, width - L - R);
  const ph = H - T - B;
  const sx = (v: number) => L + ((v - xt[0]) / (xt[xt.length - 1] - xt[0] || 1)) * pw;
  const sy = (v: number) => T + ph - ((v - yt[0]) / (yt[yt.length - 1] - yt[0] || 1)) * ph;
  const x0 = xt[0];
  const x1 = xt[xt.length - 1];

  const animateTo = (tm: number, tb: number) => {
    const sm = m;
    const sb = b;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      const e = 1 - (1 - k) ** 3;
      setM(sm + (tm - sm) * e);
      setB(sb + (tb - sb) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    <VisualFrame
      kind="Regresi interaktif"
      title={(spec.judul as string) || 'Cari garis yang paling pas dengan data'}
      caption={(spec.keterangan as string) || 'Garis tipis merah = residual (selisih nilai asli dengan prediksi garis). Regresi linear memilih garis dengan rata-rata kuadrat residual (MSE) paling kecil — geser slider lalu bandingkan dengan tombol Garis terbaik.'}
      controls={
        <>
          <button type="button" className="btn !py-1" onClick={() => animateTo(ols.m * (0.2 + Math.random() * 1.6), ols.my * (0.3 + Math.random()))}>
            Acak
          </button>
          <button type="button" className="btn-primary !py-1" onClick={() => animateTo(ols.m, ols.b)}>
            Garis terbaik
          </button>
        </>
      }
    >
      <ResponsiveGrid min={640} wide="grid-cols-[minmax(0,1fr)_220px]" className="gap-3">
        <div ref={ref} className="min-w-0">
          {width > 0 && (
            <svg width={width} height={H} role="img" aria-label="Scatter data dengan garis regresi">
              {yt.map((t) => (
                <g key={`y${t}`}>
                  <line x1={L} x2={L + pw} y1={sy(t)} y2={sy(t)} stroke="var(--chart-grid)" />
                  <text x={L - 6} y={sy(t) + 3.5} fontSize="10" textAnchor="end" fill="var(--chart-text)">
                    {formatNumber(t, 0)}
                  </text>
                </g>
              ))}
              {xt.map((t) => (
                <text key={`x${t}`} x={sx(t)} y={T + ph + 14} fontSize="10" textAnchor="middle" fill="var(--chart-text)">
                  {formatNumber(t, 0)}
                </text>
              ))}
              <text x={L + pw / 2} y={H - 4} fontSize="10.5" textAnchor="middle" fill="var(--chart-text-strong)">
                {xLabel}
              </text>
              <text x={10} y={T + ph / 2} fontSize="10.5" textAnchor="middle" fill="var(--chart-text-strong)" transform={`rotate(-90 10 ${T + ph / 2})`}>
                {yLabel}
              </text>
              {pts.map(([x, y], i) => (
                <line key={`r${i}`} x1={sx(x)} x2={sx(x)} y1={sy(y)} y2={sy(m * x + b)} stroke="rgb(var(--c-err))" strokeOpacity="0.6" strokeWidth="1.5" />
              ))}
              <line x1={sx(x0)} y1={sy(m * x0 + b)} x2={sx(x1)} y2={sy(m * x1 + b)} stroke="var(--series-2)" strokeWidth="2.5" strokeLinecap="round" />
              {pts.map(([x, y], i) => (
                <circle key={i} cx={sx(x)} cy={sy(y)} r="4.5" fill="var(--series-1)" stroke="var(--chart-surface)" strokeWidth="2">
                  <title>{`${xLabel}: ${x}, ${yLabel}: ${y}`}</title>
                </circle>
              ))}
            </svg>
          )}
        </div>
        <div className="space-y-3 text-xs">
          <label className="block">
            <div className="flex justify-between text-fg2">
              <span>Kemiringan (koefisien)</span>
              <span className="font-mono text-fg">{formatNumber(m, 2)}</span>
            </div>
            <input type="range" className="w-full accent-[rgb(var(--c-accent-solid))]" min={Math.min(0, ols.m * 2)} max={Math.max(0, ols.m) + mRange} step={mRange / 200} value={m} onChange={(e) => setM(Number(e.target.value))} />
          </label>
          <label className="block">
            <div className="flex justify-between text-fg2">
              <span>Intersep</span>
              <span className="font-mono text-fg">{formatNumber(b, 0)}</span>
            </div>
            <input
              type="range"
              className="w-full accent-[rgb(var(--c-accent-solid))]"
              min={Math.min(0, ols.b) - Math.abs(ols.my)}
              max={Math.abs(ols.my) * 2}
              step={Math.abs(ols.my) / 200 || 1}
              value={b}
              onChange={(e) => setB(Number(e.target.value))}
            />
          </label>
          <div className="rounded-lg border border-line bg-panel2 p-2.5 font-mono">
            <div className="text-2xs text-fg3">Model</div>
            <div className="text-fg">
              ŷ = {formatNumber(m, 2)} × x {b >= 0 ? '+' : '−'} {formatNumber(Math.abs(b), 0)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-line p-2">
              <div className="text-2xs text-fg3">MAE</div>
              <div className="font-semibold text-fg">{formatNumber(mae, 0)}</div>
              <div className="text-[10px] text-fg3">terbaik {formatNumber(bestMae, 0)}</div>
            </div>
            <div className="rounded-lg border border-line p-2">
              <div className="text-2xs text-fg3">MSE</div>
              <div className="font-semibold text-fg">{formatNumber(mse, 0)}</div>
              <div className="text-[10px] text-fg3">terbaik {formatNumber(bestMse, 0)}</div>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-panel3" title="Seberapa dekat dengan garis terbaik">
            <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${Math.max(3, Math.min(100, (bestMse / Math.max(mse, 1e-9)) * 100))}%` }} />
          </div>
        </div>
      </ResponsiveGrid>
    </VisualFrame>
  );
};
