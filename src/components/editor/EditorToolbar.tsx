import React from 'react';
import { Play, RotateCcw, Lightbulb, FileCode, Code, CheckCircle, Loader2 } from 'lucide-react';

interface EditorToolbarProps {
  language: 'python' | 'sql' | 'javascript';
  isRunning: boolean;
  onRun: () => void;
  onReset: () => void;
  onOpenHint: () => void;
  onOpenSolution: () => void;
  hintCount: number;
  hintsUsed: number;
  runtimeReady: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  language,
  isRunning,
  onRun,
  onReset,
  onOpenHint,
  onOpenSolution,
  hintCount,
  hintsUsed,
  runtimeReady,
}) => {
  return (
    <div className="h-11 bg-dark-850 border-b border-slate-800 flex items-center justify-between px-3 shrink-0">
      {/* Left: Language & Status */}
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-dark-950 border border-slate-750 text-[11px] font-mono text-slate-300 uppercase">
          <Code size={12} className="text-cyan-400" />
          {language}
        </span>

        <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              runtimeReady ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}
          />
          {runtimeReady ? 'Runtime Siap' : 'Inisialisasi...'}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Reset Button */}
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-dark-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors"
          title="Reset kode ke starter template"
        >
          <RotateCcw size={12} />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Hint Button */}
        {hintCount > 0 && (
          <button
            onClick={onOpenHint}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-dark-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
            title="Buka petunjuk bertahap"
          >
            <Lightbulb size={12} className="text-amber-400" />
            <span>Hint {hintsUsed > 0 ? `(${hintsUsed}/${hintCount})` : `(${hintCount})`}</span>
          </button>
        )}

        {/* Solution Button */}
        <button
          onClick={onOpenSolution}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-dark-800 hover:bg-slate-750 text-purple-300 border border-purple-500/30 text-xs font-medium transition-colors"
          title="Lihat kode solusi referensi"
        >
          <FileCode size={12} className="text-purple-400" />
          <span className="hidden sm:inline">Solusi</span>
        </button>

        {/* Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning || !runtimeReady}
          className={`flex items-center gap-1.5 px-3.5 py-1 rounded-md text-xs font-semibold text-white shadow-md transition-all ${
            isRunning || !runtimeReady
              ? 'bg-brand-600/50 cursor-not-allowed text-slate-300'
              : 'bg-brand-600 hover:bg-brand-500 active:scale-95 shadow-brand-500/20'
          }`}
          title="Jalankan kode dan uji penilaian (Ctrl + Enter)"
        >
          {isRunning ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Menjalankan...</span>
            </>
          ) : (
            <>
              <Play size={13} className="fill-white" />
              <span>Jalankan</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
