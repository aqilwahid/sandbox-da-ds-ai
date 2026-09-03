import React, { useMemo } from 'react';
import { marked } from 'marked';
import {
  Clock,
  Cpu,
  Layers,
  AlertTriangle,
  Lightbulb,
  FileCode,
  BookOpen,
  CheckCircle,
} from 'lucide-react';
import type { Exercise } from '../../content/types';
import type { ExerciseProgressRecord } from '../../db';

interface InstructionPanelProps {
  exercise: Exercise;
  progress?: ExerciseProgressRecord;
  allExercises: Exercise[];
  progressMap: Record<string, ExerciseProgressRecord>;
  onOpenHint: () => void;
  onOpenSolution: () => void;
}

export const InstructionPanel: React.FC<InstructionPanelProps> = ({
  exercise,
  progress,
  allExercises,
  progressMap,
  onOpenHint,
  onOpenSolution,
}) => {
  // Parse markdown instructions to HTML safely
  const renderedHtml = useMemo(() => {
    try {
      return marked.parse(exercise.sections.instruksi, { async: false }) as string;
    } catch (e) {
      return `<p class="text-rose-400">Gagal merender instruksi markdown: ${String(e)}</p>`;
    }
  }, [exercise.sections.instruksi]);

  // Check uncompleted prerequisites
  const uncompletedPrereqs = useMemo(() => {
    if (!exercise.frontmatter.prerequisites || exercise.frontmatter.prerequisites.length === 0) {
      return [];
    }
    return exercise.frontmatter.prerequisites.filter((prereqId) => {
      const p = progressMap[prereqId];
      return !p || (p.status !== 'lulus' && p.status !== 'lihat-solusi');
    });
  }, [exercise.frontmatter.prerequisites, progressMap]);

  return (
    <div className="h-full flex flex-col bg-dark-900 border-r border-slate-800 overflow-hidden">
      {/* Exercise Header */}
      <div className="p-4 border-b border-slate-800 bg-dark-850 shrink-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-brand-500/15 text-brand-300 border border-brand-500/30 uppercase">
            {exercise.track}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 flex items-center gap-1">
            <Cpu size={11} />
            {exercise.frontmatter.runtime}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-slate-800/80 border border-slate-700/60 flex items-center gap-1">
            <Clock size={11} />
            ~{exercise.frontmatter.estimatedMinutes} menit
          </span>

          {progress?.status === 'lulus' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 flex items-center gap-1">
              <CheckCircle size={11} />
              Lulus
            </span>
          )}
        </div>

        <h1 className="text-base font-bold text-white tracking-tight leading-snug">
          {exercise.frontmatter.title}
        </h1>

        {/* Datasets or packages */}
        {exercise.frontmatter.datasets && exercise.frontmatter.datasets.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-[11px] font-mono text-slate-400">Dataset:</span>
            {exercise.frontmatter.datasets.map((ds) => (
              <span
                key={ds}
                className="px-1.5 py-0.5 rounded bg-dark-950 border border-slate-800 text-[10px] font-mono text-amber-300/90"
              >
                {ds}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Prerequisite Alert if not completed */}
      {uncompletedPrereqs.length > 0 && (
        <div className="m-3 p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs shrink-0 flex items-start gap-2.5 shadow-sm">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold block mb-0.5">Prasyarat Belum Selesai</span>
            Latihan ini menyarankan Anda menyelesaikan modul sebelumnya:{' '}
            <span className="font-mono text-amber-300 underline">
              {uncompletedPrereqs.join(', ')}
            </span>
            . Anda tetap dapat melanjutkan latihan ini.
          </div>
        </div>
      )}

      {/* Markdown Instructions Body */}
      <div className="flex-1 overflow-y-auto p-5">
        <div
          className="prose-dark max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </div>

      {/* Quick Help Footer */}
      <div className="p-3 border-t border-slate-800 bg-dark-850 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2">
          {exercise.sections.hints && exercise.sections.hints.length > 0 && (
            <button
              onClick={onOpenHint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 font-medium transition-colors"
            >
              <Lightbulb size={14} className="text-amber-400" />
              <span>
                Hint {progress?.hintsUsed ? `(${progress.hintsUsed}/${exercise.sections.hints.length})` : `(${exercise.sections.hints.length})`}
              </span>
            </button>
          )}

          <button
            onClick={onOpenSolution}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-slate-750 text-purple-300 border border-purple-500/30 font-medium transition-colors"
          >
            <FileCode size={14} className="text-purple-400" />
            <span>Lihat Solusi</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          Ctrl+Enter untuk Run
        </span>
      </div>
    </div>
  );
};
