import React from 'react';
import { Check, Copy, Loader2, Play, RotateCcw, Square } from 'lucide-react';

interface Props {
  language: 'python' | 'sql';
  running: boolean;
  runtimeReady: boolean;
  runtimeMessage: string;
  savedAt: number | null;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
  onCopy: () => void;
  copied: boolean;
}

export const EditorToolbar: React.FC<Props> = ({
  language,
  running,
  runtimeReady,
  runtimeMessage,
  savedAt,
  onRun,
  onStop,
  onReset,
  onCopy,
  copied,
}) => (
  <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-line bg-panel px-2.5">
    <div className="flex min-w-0 items-center gap-2">
      <span className="rounded-md border border-line bg-panel2 px-2 py-0.5 font-mono text-2xs font-semibold uppercase text-fg2">
        {language === 'sql' ? 'SQL · DuckDB' : 'Python 3'}
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-2xs text-fg3" title={runtimeMessage}>
        <span className={`h-2 w-2 shrink-0 rounded-full ${runtimeReady ? 'bg-ok' : 'animate-pulse bg-warn'}`} />
        <span className="truncate">{runtimeReady ? (savedAt ? 'Siap · tersimpan otomatis' : 'Siap') : runtimeMessage}</span>
      </span>
    </div>
    <div className="flex shrink-0 items-center gap-1.5">
      <button type="button" className="btn-ghost" onClick={onCopy} title="Salin kode">
        {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
      </button>
      <button type="button" className="btn-ghost" onClick={onReset} title="Kembalikan kode ke kondisi awal (starter)">
        <RotateCcw size={13} />
        <span className="hidden lg:inline">Reset</span>
      </button>
      {running ? (
        <button type="button" onClick={onStop} className="inline-flex items-center gap-1.5 rounded-md bg-err px-3 py-1.5 text-xs font-semibold text-white shadow-card hover:brightness-110">
          <Square size={11} className="fill-current" /> Stop
        </button>
      ) : (
        <button type="button" onClick={onRun} disabled={!runtimeReady} className="btn-primary" title="Jalankan & periksa (Ctrl+Enter)">
          {runtimeReady ? <Play size={12} className="fill-current" /> : <Loader2 size={12} className="animate-spin" />}
          Jalankan
          <span className="hidden rounded bg-white/15 px-1 text-[10px] font-medium xl:inline">Ctrl+↵</span>
        </button>
      )}
    </div>
  </div>
);
