import React, { useMemo, useState } from 'react';
import { formatPercent } from '../../lib/format';
import { VisualFrame } from './shared';

function softmax(logits: number[], t: number) {
  const z = logits.map((l) => l / Math.max(t, 1e-6));
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

export const Temperature: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const konteks = String(spec.konteks || 'Pengiriman paket ini sangat');
  const kandidat = ((spec.kandidat as [string, number][]) || [
    ['cepat', 3.2],
    ['lambat', 2.6],
    ['aman', 1.8],
    ['rapi', 1.1],
    ['mahal', 0.6],
    ['biru', -1.4],
  ]).map(([t, l]) => [String(t), Number(l)] as [string, number]);
  const [temp, setTemp] = useState(1);
  const [samples, setSamples] = useState<string[]>([]);
  const probs = useMemo(() => softmax(kandidat.map((k) => k[1]), temp), [kandidat, temp]);
  const maxP = Math.max(...probs);

  const sample = (count: number) => {
    const out: string[] = [];
    for (let s = 0; s < count; s++) {
      let r = Math.random();
      let pick = kandidat.length - 1;
      for (let i = 0; i < probs.length; i++) {
        r -= probs[i];
        if (r <= 0) {
          pick = i;
          break;
        }
      }
      out.push(kandidat[pick][0]);
    }
    setSamples((prev) => [...out, ...prev].slice(0, 40));
  };
  const counts = samples.reduce<Record<string, number>>((acc, t) => ((acc[t] = (acc[t] || 0) + 1), acc), {});

  return (
    <VisualFrame
      kind="Temperature & sampling"
      title={(spec.judul as string) || 'Bagaimana LLM memilih kata berikutnya'}
      caption={(spec.keterangan as string) || 'Rumus: p(token) = e^(logit/T) ÷ Σ e^(logit/T). Temperature rendah → hampir selalu memilih token teratas; tinggi → pilihan lebih beragam (dan lebih sering "aneh").'}
    >
      <div className="rounded-lg border border-line bg-panel2 px-3 py-2 font-mono text-sm text-fg">
        {konteks} <span className="rounded bg-accent/15 px-1 text-accent">___</span>
      </div>
      <label className="mt-3 flex items-center gap-3 text-xs text-fg2">
        <span className="shrink-0">Temperature</span>
        <input type="range" min={0.1} max={2} step={0.05} value={temp} onChange={(e) => setTemp(Number(e.target.value))} className="flex-1 accent-[rgb(var(--c-accent-solid))]" />
        <span className="w-10 text-right font-mono text-sm font-semibold text-fg">{temp.toFixed(2)}</span>
      </label>
      <div className="mt-3 space-y-1.5">
        {kandidat.map(([tok, logit], i) => (
          <div key={tok} className="grid grid-cols-[80px_1fr_56px] items-center gap-2 text-xs">
            <span className="truncate font-mono text-fg">{tok}</span>
            <div className="h-5 overflow-hidden rounded bg-panel3">
              <div
                className="h-full rounded transition-[width] duration-300"
                style={{ width: `${(probs[i] / maxP) * 100}%`, background: 'var(--series-1)', opacity: probs[i] === maxP ? 1 : 0.7 }}
                title={`logit ${logit}`}
              />
            </div>
            <span className="text-right font-mono text-fg tabular">{formatPercent(probs[i], 1)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary !py-1" onClick={() => sample(1)}>
          Ambil 1 sampel
        </button>
        <button type="button" className="btn !py-1" onClick={() => sample(20)}>
          Ambil 20 sampel
        </button>
        {samples.length > 0 && (
          <button type="button" className="btn-ghost !py-1" onClick={() => setSamples([])}>
            Bersihkan
          </button>
        )}
        {samples.length > 0 && (
          <span className="text-2xs text-fg2">
            {Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .map(([t, n]) => `${t} ×${n}`)
              .join(' · ')}
          </span>
        )}
      </div>
      {samples.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {samples.slice(0, 20).map((s, i) => (
            <span key={i} className="rounded bg-panel3 px-1.5 py-0.5 font-mono text-2xs text-fg">
              {s}
            </span>
          ))}
        </div>
      )}
    </VisualFrame>
  );
};
