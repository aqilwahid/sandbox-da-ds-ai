import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Lock,
  Search,
  Flame,
} from 'lucide-react';
import type { Exercise, TrackId } from '../../content/types';
import { TRACKS } from '../../content/types';
import type { ExerciseProgressRecord } from '../../db';

interface SidebarProps {
  exercises: Exercise[];
  currentExerciseId: string;
  onSelectExercise: (id: string) => void;
  currentTrack: TrackId;
  progressMap: Record<string, ExerciseProgressRecord>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  exercises,
  currentExerciseId,
  onSelectExercise,
  currentTrack,
  progressMap,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const trackExercises = exercises.filter((ex) => ex.track === currentTrack);
  const filteredExercises = trackExercises.filter((ex) =>
    ex.frontmatter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute track completion stats
  const totalCount = trackExercises.length;
  const passedCount = trackExercises.filter(
    (ex) => progressMap[ex.id]?.status === 'lulus'
  ).length;
  const percentComplete = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  const currentTrackMeta = TRACKS[currentTrack];

  const getStatusIcon = (exercise: Exercise) => {
    const progress = progressMap[exercise.id];
    const status = progress?.status || 'belum';

    switch (status) {
      case 'lulus':
        return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
      case 'lihat-solusi':
        return (
          <span title="Solusi dilihat" className="inline-flex">
            <Eye size={16} className="text-purple-400 shrink-0" />
          </span>
        );
      case 'dicoba':
        return (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" title="Sedang dikerjakan" />
        );
      case 'belum':
      default:
        return <Circle size={15} className="text-slate-600 shrink-0" />;
    }
  };

  const isPrerequisiteMet = (exercise: Exercise) => {
    if (!exercise.frontmatter.prerequisites || exercise.frontmatter.prerequisites.length === 0) {
      return true;
    }
    return exercise.frontmatter.prerequisites.every((prereqId) => {
      const p = progressMap[prereqId];
      return p && (p.status === 'lulus' || p.status === 'lihat-solusi');
    });
  };

  return (
    <aside className="h-full flex flex-col bg-dark-900 border-r border-slate-800 select-none">
      {/* Track Header & Progress */}
      <div className="p-4 border-b border-slate-800 bg-dark-850">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {currentTrackMeta.name}
          </span>
          <span className="text-xs font-mono text-brand-400 font-bold">
            {passedCount}/{totalCount} ({percentComplete}%)
          </span>
        </div>

        {/* Track Progress Bar */}
        <div className="w-full bg-dark-950 rounded-full h-1.5 overflow-hidden border border-slate-800 mb-3">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${percentComplete}%` }}
          />
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari modul latihan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredExercises.map((ex, idx) => {
          const isActive = ex.id === currentExerciseId;
          const prereqMet = isPrerequisiteMet(ex);
          const progress = progressMap[ex.id];

          return (
            <button
              key={ex.id}
              onClick={() => onSelectExercise(ex.id)}
              className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 group relative ${
                isActive
                  ? 'bg-brand-600/15 border-brand-500/50 shadow-sm text-slate-100'
                  : 'bg-transparent border-transparent hover:bg-slate-800/60 text-slate-300 hover:text-slate-100'
              }`}
            >
              <div className="mt-0.5">{getStatusIcon(ex)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-xs font-semibold truncate leading-tight">
                    {idx + 1}. {ex.frontmatter.title}
                  </span>
                  {!prereqMet && (
                    <span title="Prasyarat belum diselesaikan" className="inline-flex">
                      <Lock size={12} className="text-amber-400 shrink-0" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {ex.frontmatter.estimatedMinutes}m
                  </span>
                  <span>•</span>
                  <span className="uppercase text-slate-400">{ex.frontmatter.runtime}</span>
                  {progress?.attemptsCount ? (
                    <>
                      <span>•</span>
                      <span className="text-amber-400/80">{progress.attemptsCount}x tes</span>
                    </>
                  ) : null}
                </div>
              </div>

              {isActive && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-brand-500 rounded-full" />
              )}
            </button>
          );
        })}

        {filteredExercises.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500">
            Tidak ada latihan yang cocok dengan pencarian.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-dark-950 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1 text-slate-400">
          <Flame size={12} className="text-amber-400" />
          Offline WebAssembly
        </span>
        <span className="font-mono text-slate-400">v1.0.0</span>
      </div>
    </aside>
  );
};
