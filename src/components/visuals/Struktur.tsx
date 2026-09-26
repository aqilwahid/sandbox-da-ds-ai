import React from 'react';
import { VisualFrame } from './shared';

interface Item {
  nama?: string;
  nilai: unknown;
  keterangan?: string;
}

const fmt = (v: unknown) => {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (v instanceof Date) return `"${v.toISOString().slice(0, 10)}"`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export const Struktur: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const items: Item[] = spec.item ? (spec.item as Item[]) : [{ nama: spec.nama as string, nilai: spec.nilai, keterangan: spec.keterangan as string }];
  return (
    <VisualFrame kind="Struktur data" title={spec.judul as string | undefined}>
      <div className="space-y-4">
        {items.map((it, k) => {
          const v = it.nilai;
          const isList = Array.isArray(v);
          const isDict = v !== null && typeof v === 'object' && !isList && !(v instanceof Date);
          return (
            <div key={k}>
              <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                {it.nama && <code className="font-mono text-xs font-semibold text-fg">{it.nama}</code>}
                <span className="rounded bg-panel3 px-1.5 py-px font-mono text-[10px] text-fg2">{isList ? 'list' : isDict ? 'dict' : typeof v}</span>
                {it.keterangan && <span className="text-2xs text-fg2">{it.keterangan}</span>}
              </div>
              {isList && (
                <div className="flex flex-wrap gap-1">
                  {(v as unknown[]).map((x, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="min-w-[46px] rounded-md border border-line2 bg-panel2 px-2 py-1.5 text-center font-mono text-xs text-fg">{fmt(x)}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-fg3">[{i}]</div>
                    </div>
                  ))}
                </div>
              )}
              {isDict && (
                <div className="inline-grid overflow-hidden rounded-lg border border-line" style={{ gridTemplateColumns: 'auto auto' }}>
                  {Object.entries(v as object).map(([key, val], i) => (
                    <React.Fragment key={key}>
                      <div className={`border-line bg-panel2 px-2.5 py-1 font-mono text-xs text-accent ${i ? 'border-t' : ''}`}>"{key}"</div>
                      <div className={`border-l border-line px-2.5 py-1 font-mono text-xs text-fg ${i ? 'border-t' : ''}`}>{fmt(val)}</div>
                    </React.Fragment>
                  ))}
                </div>
              )}
              {!isList && !isDict && (
                <div className="inline-block rounded-md border border-line2 bg-panel2 px-2.5 py-1.5 font-mono text-xs text-fg">{fmt(v)}</div>
              )}
            </div>
          );
        })}
      </div>
    </VisualFrame>
  );
};
