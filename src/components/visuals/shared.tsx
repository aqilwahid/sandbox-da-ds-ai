import React, { createContext, useContext } from 'react';
import { Sparkles } from 'lucide-react';
import { formatMiniCell, type TableView } from '../../lib/transform';
import { useElementWidth } from '../charts/chartUtils';

export interface VisualCtx {
  language: 'sql' | 'python';
}
export const VisualContext = createContext<VisualCtx>({ language: 'sql' });
export const useVisualCtx = () => useContext(VisualContext);

/**
 * Lebar kontainer visual (px) — tata letak menyesuaikan lebar panel, bukan lebar layar.
 * Catatan: nilainya hanya benar untuk komponen yang dirender DI DALAM <VisualFrame>
 * (gunakan <ResponsiveGrid> atau komponen anak), bukan di komponen yang merender VisualFrame itu sendiri.
 */
const WidthContext = createContext(800);
export const useVisualWidth = () => useContext(WidthContext);

/** Grid yang berpindah dari 1 kolom ke `wide` saat lebar visual ≥ `min` px. */
export const ResponsiveGrid: React.FC<{
  min: number;
  wide: string;
  narrow?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ min, wide, narrow = 'grid-cols-1', className = '', children }) => {
  const w = useVisualWidth();
  return <div className={`grid ${className} ${w >= min ? wide : narrow}`}>{children}</div>;
};

export const groupBg = (g: number) => `var(--group-${(g % 6) + 1})`;
export const groupColor = (g: number) => `var(--series-${[1, 2, 3, 4, 5, 7][g % 6]})`;

export const VisualFrame: React.FC<{
  title?: string;
  kind: string;
  caption?: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, kind, caption, controls, children }) => {
  const [ref, width] = useElementWidth<HTMLElement>();
  return (
  <figure ref={ref} className="my-5 overflow-hidden rounded-xl border border-line bg-panel shadow-card">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel2 px-3.5 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          <Sparkles size={10} /> {kind}
        </span>
        {title && <span className="truncate text-xs font-semibold text-fg">{title}</span>}
      </div>
      {controls && <div className="flex items-center gap-1.5">{controls}</div>}
    </div>
    <div className="p-3.5">
      <WidthContext.Provider value={width || 800}>{children}</WidthContext.Provider>
    </div>
    {caption && <figcaption className="border-t border-line px-3.5 py-2 text-2xs leading-relaxed text-fg2">{caption}</figcaption>}
  </figure>
  );
};

interface MiniTableProps {
  view: TableView;
  label?: React.ReactNode;
  nullLabel?: string;
  showIndex?: boolean;
  maxRows?: number;
  compact?: boolean;
}

/** Tabel kecil dengan penanda: baris dibuang (dicoret), kelompok berwarna, kolom disorot, sel berubah. */
export const MiniTable: React.FC<MiniTableProps> = ({ view, label, nullLabel, showIndex, maxRows = 12, compact }) => {
  const { language } = useVisualCtx();
  const nl = nullLabel ?? (language === 'python' ? 'NaN' : 'NULL');
  const rows = view.rows.slice(0, maxRows);
  const hi = new Set(view.highlightCols || []);
  const dim = new Set(view.dimCols || []);
  const changed = new Set(view.changedCells || []);
  const pad = compact ? 'px-2 py-1' : 'px-2.5 py-1.5';
  return (
    <div className="min-w-0">
      {label && <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg3">{label}</div>}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-left font-mono text-[11.5px]">
          <thead>
            <tr className="bg-panel2">
              {showIndex && <th className={`${pad} border-b border-line text-right text-fg3`} />}
              {view.columns.map((c) => (
                <th
                  key={c}
                  className={`${pad} whitespace-nowrap border-b font-sans text-2xs font-semibold ${
                    hi.has(c) ? 'border-b-2 border-accent bg-accent/10 text-fg' : 'border-line text-fg2'
                  } ${dim.has(c) ? 'opacity-35' : ''}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => {
              const st = view.rowStates?.[ri] || 'normal';
              const g = view.rowGroups?.[ri];
              const style: React.CSSProperties = {};
              if (g !== undefined && g !== null) {
                style.background = groupBg(g);
                style.boxShadow = `inset 3px 0 0 ${groupColor(g)}`;
              }
              return (
                <tr
                  key={ri}
                  style={style}
                  className={`border-b border-line/60 last:border-0 transition-opacity ${
                    st === 'removed' ? 'bg-err/[0.07] text-fg3 line-through decoration-err/70 opacity-60' : ''
                  } ${st === 'new' ? 'bg-ok/10' : ''}`}
                >
                  {showIndex && <td className={`${pad} text-right text-fg3`}>{ri}</td>}
                  {r.map((v, ci) => {
                    const col = view.columns[ci];
                    const isChanged = changed.has(`${ri}:${ci}`);
                    const isNull = v === null || v === undefined;
                    return (
                      <td
                        key={ci}
                        className={`${pad} whitespace-nowrap ${typeof v === 'number' ? 'text-right tabular' : ''} ${
                          hi.has(col) && st !== 'removed' ? 'bg-accent/[0.06] font-semibold text-fg' : 'text-fg'
                        } ${dim.has(col) ? 'opacity-35' : ''} ${isChanged ? '!bg-ok/15 font-semibold' : ''}`}
                      >
                        {isNull ? <span className="italic text-fg3">{nl}</span> : formatMiniCell(v, nl)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {view.rows.length > maxRows && (
              <tr>
                <td colSpan={view.columns.length + (showIndex ? 1 : 0)} className="px-2 py-1 text-center font-sans text-2xs text-fg3">
                  … {view.rows.length - maxRows} baris lagi
                </td>
              </tr>
            )}
            {view.rows.length === 0 && (
              <tr>
                <td colSpan={view.columns.length + (showIndex ? 1 : 0)} className="px-2 py-3 text-center font-sans text-2xs text-fg3">
                  (tidak ada baris)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CodeLine: React.FC<{ html: string }> = ({ html }) => (
  <pre className="overflow-x-auto rounded-lg border border-line bg-panel2 px-3 py-2 font-mono text-xs leading-relaxed text-fg">
    <code dangerouslySetInnerHTML={{ __html: html }} />
  </pre>
);

export const PlayButton: React.FC<{ playing: boolean; onClick: () => void; label?: string }> = ({ playing, onClick, label = 'Putar' }) => (
  <button type="button" onClick={onClick} className="btn !py-1" aria-pressed={playing}>
    {playing ? '■ Berhenti' : `▶ ${label}`}
  </button>
);
