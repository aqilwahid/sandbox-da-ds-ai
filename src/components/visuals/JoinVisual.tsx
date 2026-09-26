import React, { useMemo, useState } from 'react';
import { normalizeTable, type Cell } from '../../lib/transform';
import { groupBg, groupColor, MiniTable, ResponsiveGrid, VisualFrame } from './shared';

type JoinType = 'inner' | 'left' | 'right' | 'full';
const LABEL: Record<JoinType, string> = { inner: 'INNER JOIN', left: 'LEFT JOIN', right: 'RIGHT JOIN', full: 'FULL JOIN' };
const DESC: Record<JoinType, string> = {
  inner: 'Hanya baris yang kuncinya cocok di KEDUA tabel.',
  left: 'Semua baris tabel kiri; yang tak punya pasangan diisi NULL.',
  right: 'Semua baris tabel kanan; yang tak punya pasangan diisi NULL.',
  full: 'Semua baris dari kedua tabel; yang tak punya pasangan diisi NULL.',
};

export const JoinVisual: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const left = normalizeTable((spec.kiri || {}) as Record<string, unknown>);
  const right = normalizeTable((spec.kanan || {}) as Record<string, unknown>);
  const leftName = String((spec.kiri as Record<string, unknown>)?.nama || 'kiri');
  const rightName = String((spec.kanan as Record<string, unknown>)?.nama || 'kanan');
  const key = String(spec.kunci || left.columns.find((c) => right.columns.includes(c)) || '');
  const [type, setType] = useState<JoinType>((String(spec.awal || 'inner').toLowerCase() as JoinType) || 'inner');

  const li = left.columns.indexOf(key);
  const ri = right.columns.indexOf(key);
  const keys = useMemo(() => {
    const all: string[] = [];
    [...left.rows.map((r) => r[li]), ...right.rows.map((r) => r[ri])].forEach((k) => {
      const s = String(k);
      if (!all.includes(s)) all.push(s);
    });
    return all;
  }, [left, right, li, ri]);
  const rightKeys = new Set(right.rows.map((r) => String(r[ri])));
  const leftKeys = new Set(left.rows.map((r) => String(r[li])));
  const matchedGroup = (k: Cell) => (rightKeys.has(String(k)) && leftKeys.has(String(k)) ? keys.indexOf(String(k)) : null);

  const result = useMemo(() => {
    const rCols = right.columns.filter((c) => c !== key);
    const cols = [...left.columns, ...rCols];
    const rows: Cell[][] = [];
    const groups: (number | null)[] = [];
    left.rows.forEach((lr) => {
      const matches = right.rows.filter((rr) => String(rr[ri]) === String(lr[li]));
      if (matches.length) {
        matches.forEach((m) => {
          rows.push([...lr, ...rCols.map((c) => m[right.columns.indexOf(c)])]);
          groups.push(matchedGroup(lr[li]));
        });
      } else if (type === 'left' || type === 'full') {
        rows.push([...lr, ...rCols.map(() => null)]);
        groups.push(null);
      }
    });
    if (type === 'right' || type === 'full') {
      right.rows.forEach((rr) => {
        if (!leftKeys.has(String(rr[ri]))) {
          rows.push([...left.columns.map((c) => (c === key ? rr[ri] : null)), ...rCols.map((c) => rr[right.columns.indexOf(c)])]);
          groups.push(null);
        }
      });
    }
    return { columns: cols, rows, rowGroups: groups };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, left, right, key]);

  const leftStates = left.rows.map((r) =>
    matchedGroup(r[li]) === null && (type === 'inner' || type === 'right') ? ('removed' as const) : ('normal' as const),
  );
  const rightStates = right.rows.map((r) =>
    !leftKeys.has(String(r[ri])) && (type === 'inner' || type === 'left') ? ('removed' as const) : ('normal' as const),
  );

  const fillL = type === 'left' || type === 'full';
  const fillR = type === 'right' || type === 'full';
  return (
    <VisualFrame
      kind="JOIN interaktif"
      title={(spec.judul as string) || `Menggabungkan ${leftName} dan ${rightName} lewat ${key}`}
      caption={spec.keterangan as string | undefined}
      controls={
        <div className="inline-flex rounded-md border border-line bg-panel p-0.5">
          {(['inner', 'left', 'right', 'full'] as JoinType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`rounded px-2 py-1 font-mono text-[10.5px] font-semibold ${type === t ? 'bg-accent-solid text-white' : 'text-fg3 hover:text-fg'}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-4">
        <svg width={132} height={78} viewBox="0 0 132 78" aria-label={`Diagram Venn ${LABEL[type]}`} className="shrink-0">
          <defs>
            <clipPath id="clipL">
              <circle cx="48" cy="39" r="34" />
            </clipPath>
          </defs>
          <circle cx="48" cy="39" r="34" fill={fillL ? 'rgb(var(--c-accent) / 0.35)' : 'transparent'} stroke="rgb(var(--c-fg3))" strokeWidth="1.5" />
          <circle cx="84" cy="39" r="34" fill={fillR ? 'rgb(var(--c-accent) / 0.35)' : 'transparent'} stroke="rgb(var(--c-fg3))" strokeWidth="1.5" />
          <circle cx="84" cy="39" r="34" clipPath="url(#clipL)" fill="rgb(var(--c-accent) / 0.75)" />
          <text x="26" y="43" fontSize="10" fill="rgb(var(--c-fg2))" textAnchor="middle">kiri</text>
          <text x="106" y="43" fontSize="10" fill="rgb(var(--c-fg2))" textAnchor="middle">kanan</text>
        </svg>
        <div className="min-w-[200px] flex-1">
          <div className="font-mono text-xs font-semibold text-fg">
            {leftName} {LABEL[type]} {rightName} ON {key}
          </div>
          <p className="mt-0.5 text-xs text-fg2">{DESC[type]}</p>
          <p className="mt-1 text-2xs text-fg3">Warna sama = kunci {key} yang cocok. Baris dicoret = tidak ikut ke hasil.</p>
        </div>
      </div>
      <ResponsiveGrid min={600} wide="grid-cols-2" className="mt-3 gap-3">
        <MiniTable
          label={`Tabel kiri: ${leftName}`}
          view={{ ...left, highlightCols: [key], rowStates: leftStates, rowGroups: left.rows.map((r) => matchedGroup(r[li])) }}
        />
        <MiniTable
          label={`Tabel kanan: ${rightName}`}
          view={{ ...right, highlightCols: [key], rowStates: rightStates, rowGroups: right.rows.map((r) => matchedGroup(r[ri])) }}
        />
      </ResponsiveGrid>
      <div className="mt-3">
        <MiniTable label={`Hasil ${LABEL[type]} — ${result.rows.length} baris`} view={{ ...result, highlightCols: [key] }} maxRows={16} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {keys.map((k, i) =>
          leftKeys.has(k) && rightKeys.has(k) ? (
            <span key={k} className="rounded px-1.5 py-0.5 font-mono text-[10px] text-fg" style={{ background: groupBg(i), boxShadow: `inset 3px 0 0 ${groupColor(i)}` }}>
              {k}
            </span>
          ) : null,
        )}
      </div>
    </VisualFrame>
  );
};
