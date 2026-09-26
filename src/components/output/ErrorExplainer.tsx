import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, CornerDownRight, Lightbulb, TimerOff } from 'lucide-react';
import type { RunErrorInfo } from '../../runtime/types';

export const ErrorExplainer: React.FC<{ error: RunErrorInfo; onJumpToLine?: (line: number) => void }> = ({ error, onJumpToLine }) => {
  const [showTrace, setShowTrace] = useState(false);
  const stopped = error.type === 'Timeout' || error.type === 'KeyboardInterrupt';
  return (
    <section className="overflow-hidden rounded-xl border border-err/40 bg-err/[0.06]" role="alert">
      <div className="flex items-start gap-3 p-3.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-err/15 text-err">
          {stopped ? <TimerOff size={17} /> : <AlertTriangle size={17} />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h4 className="text-sm font-semibold text-fg">{error.title}</h4>
              <code className="rounded bg-err/15 px-1.5 py-0.5 font-mono text-2xs text-err">{error.type}</code>
            </div>
            <p className="mt-1 break-words font-mono text-xs text-fg">{error.message}</p>
          </div>
          {error.line ? (
            <button
              type="button"
              onClick={() => onJumpToLine?.(error.line!)}
              className="group flex w-full items-start gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-left hover:border-err/50"
              title="Tampilkan baris ini di editor"
            >
              <CornerDownRight size={13} className="mt-0.5 shrink-0 text-err" />
              <span className="min-w-0">
                <span className="text-2xs font-semibold text-fg2 group-hover:text-fg">Baris {error.line}</span>
                {error.lineText && <code className="block truncate font-mono text-xs text-fg">{error.lineText.trim()}</code>}
              </span>
            </button>
          ) : null}
          <p className="text-xs leading-relaxed text-fg2">{error.explanation}</p>
          {error.suggestion && (
            <p className="flex items-start gap-1.5 rounded-lg bg-warn/10 px-2.5 py-1.5 text-xs text-fg">
              <Lightbulb size={13} className="mt-0.5 shrink-0 text-warn" />
              <span>{error.suggestion}</span>
            </p>
          )}
          {error.trace && error.trace.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowTrace(!showTrace)} className="inline-flex items-center gap-1 text-2xs text-fg3 hover:text-fg">
                {showTrace ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Detail teknis
              </button>
              {showTrace && (
                <pre className="mt-1 max-h-40 overflow-auto rounded-lg border border-line bg-panel2 p-2 font-mono text-2xs text-fg2">
                  {error.trace.join('\n')}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
