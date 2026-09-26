import React, { useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { highlightToHtml } from '../../lib/highlight';
import { CodeLine, VisualFrame } from './shared';

function shuffled(n: number, seed: number): number[] {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const SplitData: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const n = Math.max(8, Math.min(200, Number(spec.n) || 40));
  const [test, setTest] = useState(Number(spec.test_size) || 0.25);
  const [seed, setSeed] = useState(42);
  const order = useMemo(() => shuffled(n, seed), [n, seed]);
  const nTest = Math.ceil(n * test);
  const testSet = new Set(order.slice(0, nTest));
  return (
    <VisualFrame
      kind="Train/test split"
      title={(spec.judul as string) || 'Model belajar dari data latih, diuji dengan data yang belum pernah dilihat'}
      caption={spec.keterangan as string | undefined}
      controls={
        <button type="button" className="btn !py-1" onClick={() => setSeed((s) => (s === 42 ? 7 : s + 13))} title="Ganti random_state">
          <Shuffle size={12} /> Acak ulang
        </button>
      }
    >
      <div className="flex flex-wrap gap-1" role="img" aria-label={`${n - nTest} data latih dan ${nTest} data uji`}>
        {Array.from({ length: n }, (_, i) => (
          <div
            key={i}
            className="flex h-6 w-6 items-center justify-center rounded text-[9px] font-semibold text-white transition-colors duration-300"
            style={{ background: testSet.has(i) ? 'var(--series-2)' : 'var(--series-1)' }}
            title={`Baris ${i} → ${testSet.has(i) ? 'uji (test)' : 'latih (train)'}`}
          >
            {testSet.has(i) ? 'U' : 'L'}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-fg">
          <span className="h-3 w-3 rounded-sm" style={{ background: 'var(--series-1)' }} /> Latih (train): <strong className="tabular">{n - nTest}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-fg">
          <span className="h-3 w-3 rounded-sm" style={{ background: 'var(--series-2)' }} /> Uji (test): <strong className="tabular">{nTest}</strong>
        </span>
        <label className="flex flex-1 items-center gap-2 text-fg2">
          test_size
          <input type="range" min={0.1} max={0.5} step={0.05} value={test} onChange={(e) => setTest(Number(e.target.value))} className="w-40 accent-[rgb(var(--c-accent-solid))]" />
          <span className="font-mono text-fg">{test.toFixed(2)}</span>
        </label>
      </div>
      <div className="mt-2.5">
        <CodeLine html={highlightToHtml(`X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=${test.toFixed(2)}, random_state=${seed})`, 'python')} />
      </div>
      <p className="mt-2 text-2xs text-fg2">
        Dengan <code className="font-mono">random_state</code> yang sama, pembagian selalu identik — hasil bisa diulang siapa pun. Klik <em>Acak ulang</em> untuk melihat pembagian dengan seed lain.
      </p>
    </VisualFrame>
  );
};
