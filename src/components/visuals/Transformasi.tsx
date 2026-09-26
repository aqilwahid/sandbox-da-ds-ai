import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { highlightToHtml } from '../../lib/highlight';
import { normalizeTable, runTransform, type StepSpec } from '../../lib/transform';
import { CodeLine, MiniTable, PlayButton, useVisualCtx, useVisualWidth, VisualFrame } from './shared';

const OP_LABEL: Record<string, string> = {
  filter: 'Saring baris',
  urut: 'Urutkan',
  batasi: 'Batasi',
  pilih: 'Pilih kolom',
  kolom_baru: 'Kolom baru',
  kelompok: 'Kelompokkan',
  agregat: 'Ringkas',
  gabung: 'Gabungkan',
  peringkat: 'Peringkat',
  isi_kosong: 'Isi nilai kosong',
  hapus_kosong: 'Buang baris kosong',
  hapus_duplikat: 'Buang duplikat',
};

const TwoTables: React.FC<{ before: React.ReactNode; after: React.ReactNode }> = ({ before, after }) => {
  const wide = useVisualWidth() >= 640;
  return wide ? (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
      {before}
      <ArrowRight size={18} className="mt-10 text-accent" />
      {after}
    </div>
  ) : (
    <div className="mt-3 flex flex-col gap-1.5">
      {before}
      <ArrowDown size={16} className="mx-auto text-accent" />
      {after}
    </div>
  );
};

export const Transformasi: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const { language } = useVisualCtx();
  const data = useMemo(() => normalizeTable((spec.data || {}) as Record<string, unknown>), [spec]);
  const steps = useMemo(() => ((spec.langkah || []) as StepSpec[]).filter(Boolean), [spec]);
  const views = useMemo(() => runTransform(data, steps), [data, steps]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= views.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 2200);
    return () => clearInterval(t);
  }, [playing, views.length]);

  if (!views.length) return null;
  const v = views[Math.min(idx, views.length - 1)];
  const op = String(v.step.operasi || '').toLowerCase().replace(/-/g, '_');
  const showIndex = Boolean(spec.tampilkan_index);

  return (
    <VisualFrame
      kind="Visual langkah demi langkah"
      title={spec.judul as string | undefined}
      caption={spec.keterangan as string | undefined}
      controls={
        views.length > 1 ? (
          <PlayButton
            playing={playing}
            onClick={() => {
              if (!playing && idx >= views.length - 1) setIdx(0);
              setPlaying(!playing);
            }}
          />
        ) : undefined
      }
    >
      {views.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Langkah">
          {views.map((sv, i) => (
            <React.Fragment key={i}>
              <button
                type="button"
                role="tab"
                aria-selected={i === idx}
                onClick={() => {
                  setPlaying(false);
                  setIdx(i);
                }}
                className={`rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors ${
                  i === idx ? 'border-accent bg-accent/15 text-fg' : i < idx ? 'border-line bg-panel2 text-fg2' : 'border-line text-fg3 hover:text-fg'
                }`}
              >
                {i + 1}. {OP_LABEL[String(sv.step.operasi).toLowerCase().replace(/-/g, '_')] || String(sv.step.operasi)}
              </button>
              {i < views.length - 1 && <ArrowRight size={12} className="text-fg3" />}
            </React.Fragment>
          ))}
        </div>
      )}
      {v.step.kode && <CodeLine html={highlightToHtml(String(v.step.kode), language)} />}
      <TwoTables
        before={<MiniTable view={v.before} label="Sebelum" showIndex={showIndex} />}
        after={<MiniTable view={v.after} label="Sesudah" showIndex={showIndex && !['kelompok', 'agregat'].includes(op)} />}
      />
      <div className="mt-2.5 flex flex-wrap items-start gap-x-3 gap-y-1 text-xs">
        <span className="rounded-md bg-accent/10 px-2 py-0.5 font-medium text-fg">{v.note}</span>
        {v.step.penjelasan && <span className="text-fg2">{String(v.step.penjelasan)}</span>}
      </div>
    </VisualFrame>
  );
};
