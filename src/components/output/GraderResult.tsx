import React from 'react';
import { CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';
import type { CheckResult } from '../../runtime/types';

interface GraderResultProps {
  checkResult: CheckResult | null;
  onNextExercise?: () => void;
  hasNextExercise?: boolean;
}

export const GraderResult: React.FC<GraderResultProps> = ({
  checkResult,
  onNextExercise,
  hasNextExercise,
}) => {
  if (!checkResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-slate-500 font-mono text-xs text-center">
        <Sparkles size={24} className="text-slate-700 mb-2" />
        <span>Jalankan kode untuk melihat hasil evaluasi otomatis grader.</span>
      </div>
    );
  }

  const { passed, message, details } = checkResult;

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      <div
        className={`p-4 rounded-xl border flex flex-col gap-3 shadow-lg ${
          passed
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
            : 'bg-rose-950/30 border-rose-500/40 text-rose-100'
        }`}
      >
        <div className="flex items-start gap-3">
          {passed ? (
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 size={22} />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <XCircle size={22} />
            </div>
          )}

          <div className="flex-1">
            <h4 className="text-sm font-bold tracking-tight">
              {passed ? 'Lulus Pengujian Otomatis!' : 'Pengujian Belum Lulus'}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        {details && (
          <div className="bg-dark-950/90 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
            {details}
          </div>
        )}

        {passed && hasNextExercise && onNextExercise && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={onNextExercise}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/30"
            >
              <span>Lanjut ke Latihan Berikutnya</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
