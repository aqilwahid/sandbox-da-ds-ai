import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, RotateCcw } from 'lucide-react';
import { renderMarkdown } from '../../lib/markdown';
import { PlayButton, useVisualWidth, VisualFrame } from './shared';

interface Langkah {
  judul: string;
  isi?: string;
  detail?: string;
}

/** Daftar langkah — otomatis vertikal bila panel sempit (panah ke bawah, kartu selebar panel). */
const StepList: React.FC<{ steps: Langkah[]; active: number | null; forceVertical: boolean; onSelect: (i: number) => void }> = ({
  steps,
  active,
  forceVertical,
  onSelect,
}) => {
  const w = useVisualWidth();
  const vertical = forceVertical || w < 560;
  return (
    <ol className={`flex ${vertical ? 'flex-col' : 'flex-wrap'} items-stretch gap-1.5`}>
      {steps.map((s, i) => (
        <li key={i} className={`flex ${vertical ? 'flex-col' : ''} items-center gap-1.5`}>
          <button
            type="button"
            onClick={() => onSelect(i)}
            className={`group w-full rounded-lg border px-3 py-2 text-left transition-all ${vertical ? '' : 'min-w-[128px] max-w-[220px]'} ${
              active === i ? 'border-accent shadow-card' : 'border-line bg-panel2 hover:border-line2'
            }`}
            style={active === i ? { background: 'rgb(var(--c-accent) / 0.12)' } : undefined}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  active === i ? 'bg-accent-solid text-white' : 'bg-panel3 text-fg2'
                }`}
              >
                {i + 1}
              </span>
              <span className="text-xs font-semibold leading-tight text-fg">{s.judul}</span>
            </div>
            {s.isi && <div className="mt-1 text-2xs leading-snug text-fg2">{s.isi}</div>}
          </button>
          {i < steps.length - 1 &&
            (vertical ? <ArrowDown size={14} className="shrink-0 text-fg3" /> : <ArrowRight size={14} className="shrink-0 text-fg3" />)}
        </li>
      ))}
    </ol>
  );
};

export const Alur: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const steps = ((spec.langkah || []) as Langkah[]).filter(Boolean);
  const loop = Boolean(spec.putaran);
  const backTo = Math.max(0, Math.min(steps.length - 1, Number(spec.kembali_ke ?? 0)));
  const [active, setActive] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const vertical = String(spec.arah || '') === 'vertikal';

  useEffect(() => {
    if (!playing) return;
    let loops = 0;
    const t = setInterval(() => {
      setActive((i) => {
        if (i === null) return 0;
        if (i >= steps.length - 1) {
          if (loop && loops < 1) {
            loops++;
            return backTo;
          }
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1300);
    return () => clearInterval(t);
  }, [playing, steps.length, loop, backTo]);

  const current = active !== null ? steps[active] : null;
  return (
    <VisualFrame
      kind="Alur"
      title={spec.judul as string | undefined}
      caption={spec.keterangan as string | undefined}
      controls={
        <PlayButton
          playing={playing}
          onClick={() => {
            if (!playing) setActive(null);
            setPlaying(!playing);
          }}
        />
      }
    >
      <StepList
        steps={steps}
        active={active}
        forceVertical={vertical}
        onSelect={(i) => {
          setPlaying(false);
          setActive(active === i ? null : i);
        }}
      />
      {loop && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-panel2 px-2 py-1 text-2xs text-fg2">
          <RotateCcw size={12} className="text-accent" />
          Berulang: setelah langkah {steps.length}, kembali ke langkah {backTo + 1} ({steps[backTo]?.judul}) sampai tugas selesai.
        </div>
      )}
      {current?.detail && (
        <div className="prose-sbx mt-3 rounded-lg border border-line bg-panel2 p-3 !text-xs" dangerouslySetInnerHTML={{ __html: renderMarkdown(current.detail) }} />
      )}
    </VisualFrame>
  );
};
