import React from 'react';
import {
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crosshair,
  Database,
  Eye,
  FileCode2,
  Lightbulb,
  Lock,
} from 'lucide-react';
import { exercisesByTrack, getExercise } from '../../content/loader';
import { LEVEL_LABEL, TRACKS, type Exercise } from '../../content/types';
import type { ExerciseProgressRecord } from '../../db';
import type { DatasetRef } from '../../runtime/types';
import { DatasetExplorer } from './DatasetExplorer';
import { MarkdownView } from './MarkdownView';
import { TargetView } from './TargetView';

export type InstructionTab = 'instruksi' | 'data' | 'target' | 'pembahasan';

interface Props {
  exercise: Exercise;
  progress?: ExerciseProgressRecord;
  progressMap: Record<string, ExerciseProgressRecord>;
  datasets: DatasetRef[];
  tab: InstructionTab;
  onTabChange: (t: InstructionTab) => void;
  onOpenHint: () => void;
  onOpenSolution: () => void;
  pembahasanUnlocked: boolean;
  onNavigate: (id: string) => void;
}

export const InstructionPanel: React.FC<Props> = ({
  exercise,
  progress,
  progressMap,
  datasets,
  tab,
  onTabChange,
  onOpenHint,
  onOpenSolution,
  pembahasanUnlocked,
  onNavigate,
}) => {
  const list = exercisesByTrack(exercise.track);
  const pos = list.findIndex((e) => e.id === exercise.id);
  const prev = list[pos - 1];
  const next = list[pos + 1];
  const fm = exercise.frontmatter;
  const unmet = fm.prerequisites.filter((p) => !['lulus', 'lihat-solusi'].includes(progressMap[p]?.status || ''));
  const hintCount = exercise.sections.hints.length;

  const TabBtn: React.FC<{ id: InstructionTab; icon: React.ReactNode; label: string; extra?: React.ReactNode }> = ({ id, icon, label, extra }) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => onTabChange(id)} className={`tab ${tab === id ? 'tab-active' : ''}`}>
      {icon}
      {label}
      {extra}
    </button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <header className="shrink-0 border-b border-line px-4 pb-2.5 pt-3">
        <div className="flex items-center gap-1.5 text-2xs text-fg3">
          <span className="font-semibold" style={{ color: `rgb(var(--c-track-${exercise.track}))` }}>
            {TRACKS[exercise.track].name}
          </span>
          <span>·</span>
          <span>
            Latihan {pos + 1} dari {list.length}
          </span>
          {progress?.status === 'lulus' && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-ok/15 px-2 py-0.5 font-semibold text-ok">
              <CheckCircle2 size={11} /> Lulus
            </span>
          )}
          {progress?.status === 'lihat-solusi' && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-panel3 px-2 py-0.5 font-medium text-fg2">
              <Eye size={11} /> Solusi dilihat
            </span>
          )}
        </div>
        <h1 className="mt-1 text-[1.05rem] font-semibold leading-snug tracking-tight text-fg">{fm.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="chip">{LEVEL_LABEL[fm.level]}</span>
          <span className="chip">
            <Clock size={10} /> ±{fm.estimatedMinutes} menit
          </span>
          {fm.concepts.slice(0, 5).map((c) => (
            <span key={c} className="chip font-mono !text-[10.5px]">
              {c}
            </span>
          ))}
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-line px-2 py-1" role="tablist">
        <TabBtn id="instruksi" icon={<BookOpen size={13} />} label="Instruksi" />
        <TabBtn id="data" icon={<Database size={13} />} label="Data" extra={datasets.length ? <span className="text-[10px] text-fg3">{datasets.length}</span> : null} />
        {exercise.language === 'sql' && <TabBtn id="target" icon={<Crosshair size={13} />} label="Target" />}
        {exercise.sections.pembahasan && (
          <TabBtn id="pembahasan" icon={pembahasanUnlocked ? <BookOpenCheck size={13} /> : <Lock size={12} />} label="Pembahasan" />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'instruksi' && (
          <div className="px-4 py-4">
            {unmet.length > 0 && (
              <div className="mb-4 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-2xs text-fg">
                Disarankan menyelesaikan dulu:{' '}
                {unmet.map((id, i) => (
                  <React.Fragment key={id}>
                    {i > 0 && ', '}
                    <button type="button" className="font-semibold text-accent underline" onClick={() => onNavigate(id)}>
                      {getExercise(id)?.frontmatter.title || id}
                    </button>
                  </React.Fragment>
                ))}
                . Kamu tetap boleh lanjut.
              </div>
            )}
            <MarkdownView source={exercise.sections.instruksi} language={exercise.language} />
          </div>
        )}
        {tab === 'data' && <DatasetExplorer datasets={datasets} language={exercise.language} />}
        {tab === 'target' && exercise.language === 'sql' && <TargetView exercise={exercise} />}
        {tab === 'pembahasan' &&
          (pembahasanUnlocked ? (
            <div className="px-4 py-4">
              <MarkdownView source={exercise.sections.pembahasan} language={exercise.language} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <Lock size={20} className="text-fg3" />
              <p className="max-w-xs text-xs text-fg2">
                Pembahasan terbuka setelah kamu <strong className="text-fg">lulus</strong> latihan ini, atau setelah membuka solusi.
              </p>
            </div>
          ))}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-panel2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          {hintCount > 0 && (
            <button type="button" className="btn" onClick={onOpenHint}>
              <Lightbulb size={13} className="text-warn" /> Hint
              <span className="text-2xs text-fg3 tabular">
                {Math.min(progress?.hintsUsed || 0, hintCount)}/{hintCount}
              </span>
            </button>
          )}
          <button type="button" className="btn" onClick={onOpenSolution}>
            <FileCode2 size={13} className="text-accent" /> Solusi
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost" disabled={!prev} onClick={() => prev && onNavigate(prev.id)} title={prev ? `Sebelumnya: ${prev.frontmatter.title}` : ''}>
            <ChevronLeft size={15} />
          </button>
          <span className="text-2xs text-fg3 tabular">
            {pos + 1}/{list.length}
          </span>
          <button type="button" className="btn-ghost" disabled={!next} onClick={() => next && onNavigate(next.id)} title={next ? `Berikutnya: ${next.frontmatter.title}` : ''}>
            <ChevronRight size={15} />
          </button>
        </div>
      </footer>
    </div>
  );
};
