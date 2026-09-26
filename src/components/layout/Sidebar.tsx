import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronsLeft, ChevronsRight, Circle, CircleDot, Eye, Search } from 'lucide-react';
import { exercisesByTrack } from '../../content/loader';
import { LEVEL_LABEL, TRACK_IDS, TRACKS, type Exercise, type TrackId } from '../../content/types';
import type { ExerciseProgressRecord } from '../../db';

interface Props {
  track: TrackId;
  currentId: string;
  progressMap: Record<string, ExerciseProgressRecord>;
  onSelect: (id: string) => void;
  onTrack: (t: TrackId) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export const StatusIcon: React.FC<{ status?: string; size?: number }> = ({ status, size = 15 }) => {
  if (status === 'lulus') return <CheckCircle2 size={size} className="shrink-0 text-ok" aria-label="Lulus" />;
  if (status === 'lihat-solusi') return <Eye size={size} className="shrink-0 text-fg2" aria-label="Solusi dilihat" />;
  if (status === 'dicoba') return <CircleDot size={size} className="shrink-0 text-warn" aria-label="Sedang dikerjakan" />;
  return <Circle size={size} className="shrink-0 text-fg3/60" aria-label="Belum dikerjakan" />;
};

export const Sidebar: React.FC<Props> = ({ track, currentId, progressMap, onSelect, onTrack, collapsed, onToggle }) => {
  const [q, setQ] = useState('');
  const list = exercisesByTrack(track);
  const passed = list.filter((e) => progressMap[e.id]?.status === 'lulus').length;
  const pct = list.length ? Math.round((passed / list.length) * 100) : 0;
  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return list.filter(
      (e) => !needle || e.frontmatter.title.toLowerCase().includes(needle) || e.frontmatter.concepts.some((c) => c.toLowerCase().includes(needle)),
    );
  }, [list, q]);

  if (collapsed) {
    return (
      <aside className="flex h-full w-12 flex-col items-center gap-1 border-r border-line bg-panel py-2">
        <button type="button" className="btn-ghost mb-1" onClick={onToggle} title="Buka daftar latihan" aria-label="Buka daftar latihan">
          <ChevronsRight size={15} />
        </button>
        {list.map((e, i) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onSelect(e.id)}
            title={`${i + 1}. ${e.frontmatter.title}`}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-2xs font-semibold ${
              e.id === currentId ? 'bg-accent-solid text-white' : 'text-fg2 hover:bg-panel3'
            }`}
          >
            {i + 1}
            {progressMap[e.id]?.status === 'lulus' && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ok ring-2 ring-panel" />}
          </button>
        ))}
      </aside>
    );
  }

  let lastLevel = '';
  return (
    <aside className="flex h-full min-w-0 flex-col border-r border-line bg-panel">
      <div className="space-y-2.5 border-b border-line p-3">
        <div className="flex items-center justify-between">
          <div className="grid flex-1 grid-cols-3 gap-0.5 rounded-lg border border-line bg-panel2 p-0.5" role="tablist" aria-label="Pilih track">
            {TRACK_IDS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={t === track}
                onClick={() => onTrack(t)}
                className={`rounded-md px-1 py-1 text-2xs font-semibold transition-colors ${t === track ? 'bg-panel3 text-fg shadow-card' : 'text-fg3 hover:text-fg'}`}
                title={TRACKS[t].name}
              >
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: `rgb(var(--c-track-${t}))` }} />
                {TRACKS[t].short}
              </button>
            ))}
          </div>
          <button type="button" className="btn-ghost ml-1 !px-1.5" onClick={onToggle} title="Sembunyikan daftar" aria-label="Sembunyikan daftar latihan">
            <ChevronsLeft size={15} />
          </button>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-fg">{TRACKS[track].name}</span>
            <span className="text-2xs text-fg3 tabular">
              {passed}/{list.length} lulus
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel3">
            <div className="h-full rounded-full bg-ok transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg3" />
          <input className="input !pl-8" placeholder="Cari judul atau konsep…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari latihan" />
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Daftar latihan">
        {filtered.map((e: Exercise) => {
          const idx = list.indexOf(e);
          const p = progressMap[e.id];
          const active = e.id === currentId;
          const header = e.frontmatter.level !== lastLevel ? LEVEL_LABEL[e.frontmatter.level] : null;
          lastLevel = e.frontmatter.level;
          return (
            <React.Fragment key={e.id}>
              {header && !q && <div className="px-2 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-fg3">{header}</div>}
              <button
                type="button"
                onClick={() => onSelect(e.id)}
                aria-current={active ? 'true' : undefined}
                className={`group mb-0.5 flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  active ? 'bg-accent/15 ring-1 ring-accent/40' : 'hover:bg-panel3'
                }`}
              >
                <span className="mt-0.5">
                  <StatusIcon status={p?.status} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-xs leading-snug ${active ? 'font-semibold text-fg' : 'text-fg'}`}>
                    <span className="text-fg3 tabular">{idx + 1}.</span> {e.frontmatter.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-fg3">
                    <span>{e.frontmatter.estimatedMinutes} mnt</span>
                    {p?.lastScore && p.status !== 'lulus' && (
                      <span className="tabular">
                        · {p.lastScore.passed}/{p.lastScore.total} kriteria
                      </span>
                    )}
                    {p?.attemptsCount ? <span className="tabular">· {p.attemptsCount}× jalan</span> : null}
                  </span>
                </span>
              </button>
            </React.Fragment>
          );
        })}
        {!filtered.length && <p className="p-4 text-center text-xs text-fg3">Tidak ada latihan yang cocok.</p>}
      </nav>
    </aside>
  );
};
