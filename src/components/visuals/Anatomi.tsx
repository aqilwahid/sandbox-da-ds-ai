import React, { useState } from 'react';
import { highlightToHtml } from '../../lib/highlight';
import { groupColor, useVisualCtx, useVisualWidth, VisualFrame } from './shared';

interface Bagian {
  teks: string;
  label?: string;
}

/** Baris-baris anatomi — dirender di dalam VisualFrame agar bisa membaca lebar panel. */
const Rows: React.FC<{ parts: Bagian[]; lang: string }> = ({ parts, lang }) => {
  const wide = useVisualWidth() >= 520;
  const [active, setActive] = useState<number | null>(null);
  const wrap = lang === 'teks' ? 'whitespace-pre-wrap break-words' : 'whitespace-pre';
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel2">
      {parts.map((p, i) => (
        <div
          key={i}
          onMouseEnter={() => setActive(i)}
          onMouseLeave={() => setActive(null)}
          className={`grid gap-x-4 border-b border-line/70 px-3 py-1.5 last:border-0 ${wide ? 'grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]' : 'grid-cols-1'} ${
            active === i ? 'bg-accent/[0.07]' : ''
          }`}
          style={{ boxShadow: `inset 3px 0 0 ${groupColor(i)}` }}
        >
          <pre className={`overflow-x-auto font-mono text-xs leading-6 text-fg ${wrap}`}>
            <code dangerouslySetInnerHTML={{ __html: lang === 'teks' ? escape(p.teks) : highlightToHtml(String(p.teks ?? ''), lang) }} />
          </pre>
          {p.label && (
            <div className={`flex items-start gap-1.5 text-xs leading-5 text-fg2 ${wide ? 'py-0.5' : 'pb-1'}`}>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: groupColor(i) }} />
              <span>{p.label}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const Anatomi: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const ctx = useVisualCtx();
  const lang = String(spec.bahasa || ctx.language);
  const parts = ((spec.bagian || []) as Bagian[]).filter(Boolean);
  return (
    <VisualFrame kind="Anatomi" title={spec.judul as string | undefined} caption={spec.keterangan as string | undefined}>
      <Rows parts={parts} lang={lang} />
    </VisualFrame>
  );
};

function escape(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
