import React from 'react';
import { normalizeTable } from '../../lib/transform';
import { MiniTable, VisualFrame } from './shared';

const asList = (v: unknown): unknown[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

/** Tabel mini dengan sorotan kolom/baris dan label penjelas (mis. anatomi DataFrame). */
export const TabelVisual: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const table = normalizeTable(spec as Record<string, unknown>);
  const hiCols = asList(spec.sorot_kolom).map(String);
  const hiRows = asList(spec.sorot_baris).map(Number);
  const showIndex = Boolean(spec.tampilkan_index);
  return (
    <VisualFrame kind="Tabel" title={spec.judul as string | undefined} caption={spec.keterangan as string | undefined}>
      <div className="flex flex-wrap gap-2 pb-2 text-2xs">
        {showIndex && spec.label_index !== false && (
          <span className="chip">
            <span className="h-2 w-2 rounded-sm bg-fg3/60" /> {String(spec.label_index || 'Index = nomor/label baris')}
          </span>
        )}
        {hiCols.length > 0 && (
          <span className="chip">
            <span className="h-2 w-2 rounded-sm bg-accent" /> {String(spec.label_kolom || `Kolom ${hiCols.join(', ')}`)}
          </span>
        )}
        {hiRows.length > 0 && (
          <span className="chip">
            <span className="h-2 w-2 rounded-sm" style={{ background: 'var(--series-3)' }} /> {String(spec.label_baris || 'Baris yang disorot')}
          </span>
        )}
      </div>
      <MiniTable
        view={{
          ...table,
          highlightCols: hiCols,
          rowGroups: hiRows.length ? table.rows.map((_, i) => (hiRows.includes(i) ? 2 : null)) : undefined,
        }}
        showIndex={showIndex}
        maxRows={20}
      />
    </VisualFrame>
  );
};
