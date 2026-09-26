import React, { useEffect, useState } from 'react';
import { ArrowRight, Award, CheckCircle2, Image as ImageIcon, LayoutList, Terminal, Variable, XCircle } from 'lucide-react';
import type { CheckResult, RunResult } from '../../runtime/types';
import { formatDuration } from '../../lib/format';
import { ConsoleView } from './ConsoleView';
import { FiguresView } from './FiguresView';
import { GraderView } from './GraderView';
import { ResultsView } from './ResultsView';
import { VariablesView } from './VariablesView';

export interface RunState {
  running: boolean;
  checking: boolean;
  result: RunResult | null;
  check: CheckResult | null;
  stdout: string;
  stderr: string;
  runKey: number;
}

type Tab = 'hasil' | 'grafik' | 'konsol' | 'variabel' | 'penilaian';

interface Props {
  state: RunState;
  language: 'sql' | 'python';
  onJumpToLine: (line: number) => void;
  onRun: () => void;
  onNext?: () => void;
  hasNext: boolean;
  onShowPembahasan?: () => void;
}

export const OutputPanel: React.FC<Props> = ({ state, language, onJumpToLine, onRun, onNext, hasNext, onShowPembahasan }) => {
  const [tab, setTab] = useState<Tab>('hasil');
  const { result, check, running, checking } = state;
  const figures = result?.figures || [];
  const displays = result?.displays || [];

  // Pilih tab yang paling relevan setiap ada hasil baru
  useEffect(() => {
    if (running) {
      setTab((t) => (t === 'konsol' ? 'konsol' : 'hasil'));
      return;
    }
    if (!result) return;
    if (result.error) setTab('hasil');
    else if (figures.length && !displays.length) setTab('grafik');
    else setTab('hasil');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.runKey, running]);

  const TabBtn: React.FC<{ id: Tab; icon: React.ReactNode; label: string; badge?: React.ReactNode }> = ({ id, icon, label, badge }) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`tab ${tab === id ? 'tab-active' : ''}`}>
      {icon}
      <span>{label}</span>
      {badge}
    </button>
  );
  const count = (n: number) => (n ? <span className="rounded-full bg-panel3 px-1.5 text-[10px] font-semibold text-fg2">{n}</span> : null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-panel px-2 py-1">
        <div className="flex items-center gap-0.5 overflow-x-auto" role="tablist">
          <TabBtn id="hasil" icon={<LayoutList size={13} />} label="Hasil" badge={result?.error ? <span className="h-1.5 w-1.5 rounded-full bg-err" /> : count(displays.length)} />
          {language === 'python' && <TabBtn id="grafik" icon={<ImageIcon size={13} />} label="Grafik" badge={count(figures.length)} />}
          <TabBtn
            id="konsol"
            icon={<Terminal size={13} />}
            label="Konsol"
            badge={state.stdout || state.stderr ? <span className={`h-1.5 w-1.5 rounded-full ${running ? 'animate-pulse bg-accent' : 'bg-fg3'}`} /> : null}
          />
          {language === 'python' && <TabBtn id="variabel" icon={<Variable size={13} />} label="Variabel" badge={count(result?.variables?.length || 0)} />}
          <TabBtn
            id="penilaian"
            icon={<Award size={13} />}
            label="Penilaian"
            badge={check ? <span className={`h-1.5 w-1.5 rounded-full ${check.passed ? 'bg-ok' : 'bg-warn'}`} /> : null}
          />
        </div>
        {result && !running && (
          <span className="hidden shrink-0 text-2xs text-fg3 tabular sm:inline">{formatDuration(result.durationMs)}</span>
        )}
      </div>

      {check && !running && tab !== 'penilaian' && (
        <button
          type="button"
          onClick={() => (check.passed && hasNext && onNext ? onNext() : setTab('penilaian'))}
          className={`flex shrink-0 items-center gap-2 border-b px-3 py-1.5 text-left text-xs ${
            check.passed ? 'border-ok/30 bg-ok/[0.08] text-fg' : 'border-warn/30 bg-warn/[0.08] text-fg'
          }`}
        >
          {check.passed ? <CheckCircle2 size={14} className="shrink-0 text-ok" /> : <XCircle size={14} className="shrink-0 text-warn" />}
          <span className="min-w-0 flex-1 truncate">
            <strong>{check.passed ? 'Lulus!' : `${check.passedCount}/${check.totalCount} kriteria terpenuhi.`}</strong>{' '}
            <span className="text-fg2">{check.passed ? 'Semua kriteria terpenuhi.' : check.message}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 font-medium text-accent">
            {check.passed && hasNext ? 'Latihan berikutnya' : 'Lihat detail'} <ArrowRight size={12} />
          </span>
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'hasil' && (
          <ResultsView result={result} running={running} liveStdout={state.stdout} language={language} onJumpToLine={onJumpToLine} onRun={onRun} />
        )}
        {tab === 'grafik' && <FiguresView figures={figures} />}
        {tab === 'konsol' && <ConsoleView stdout={state.stdout} stderr={state.stderr} running={running} />}
        {tab === 'variabel' && <VariablesView variables={result?.variables || []} runKey={state.runKey} />}
        {tab === 'penilaian' && (
          <GraderView
            check={check}
            checking={checking}
            hasError={Boolean(result?.error)}
            hasRun={Boolean(result)}
            onNext={onNext}
            hasNext={hasNext}
            onShowPembahasan={onShowPembahasan}
          />
        )}
      </div>
    </div>
  );
};
