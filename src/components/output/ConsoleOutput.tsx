import React from 'react';
import { Terminal, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { RunResult } from '../../runtime/types';

interface ConsoleOutputProps {
  runResult: RunResult | null;
  isRunning: boolean;
}

export const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ runResult, isRunning }) => {
  if (isRunning) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-slate-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
          <span>Mengeksekusi kode di Web Worker terisolasi...</span>
        </div>
      </div>
    );
  }

  if (!runResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-slate-500 font-mono text-xs text-center">
        <Terminal size={28} className="text-slate-700 mb-2" />
        <span>Belum ada output. Tekan "Jalankan" atau Ctrl+Enter untuk mengeksekusi kode.</span>
      </div>
    );
  }

  const hasOutput = Boolean(runResult.stdout || runResult.stderr || runResult.error);

  return (
    <div className="h-full flex flex-col font-mono text-xs overflow-hidden">
      {/* Execution Meta Bar */}
      <div className="px-3 py-1.5 bg-dark-950/80 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          {runResult.error ? (
            <span className="text-rose-400 flex items-center gap-1 font-semibold">
              <AlertCircle size={12} />
              Gagal
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 size={12} />
              Selesai
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-400 font-mono">
          <Clock size={11} />
          <span>{runResult.durationMs}ms</span>
        </div>
      </div>

      {/* Output Streams */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 select-text">
        {runResult.stdout && (
          <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
            {runResult.stdout}
          </div>
        )}

        {runResult.stderr && (
          <div className="text-rose-400/90 whitespace-pre-wrap bg-rose-950/20 p-2.5 rounded border border-rose-900/40 leading-relaxed">
            {runResult.stderr}
          </div>
        )}

        {!hasOutput && (
          <div className="text-slate-500 italic">Kode dieksekusi tanpa menghasilkan output konsol.</div>
        )}
      </div>
    </div>
  );
};
