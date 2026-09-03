import React, { useState, useEffect } from 'react';
import { Terminal, Table as TableIcon, FileJson, Award, Image as ImageIcon, Download } from 'lucide-react';
import type { CheckResult, RunResult, TableArtifactData } from '../../runtime/types';
import { ConsoleOutput } from './ConsoleOutput';
import { TableArtifact } from './TableArtifact';
import { GraderResult } from './GraderResult';

interface OutputPanelProps {
  runResult: RunResult | null;
  streamingStdout: string;
  streamingStderr: string;
  checkResult: CheckResult | null;
  isRunning: boolean;
  onNextExercise?: () => void;
  hasNextExercise?: boolean;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  runResult,
  streamingStdout,
  streamingStderr,
  checkResult,
  isRunning,
  onNextExercise,
  hasNextExercise,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'table' | 'image' | 'json' | 'grader'>('console');

  const imageArtifacts = runResult?.artifacts?.filter((a) => a.type === 'image') || [];
  const tableArtifact = runResult?.artifacts?.find((a) => a.type === 'table');
  const jsonArtifact = runResult?.artifacts?.find((a) => a.type === 'json');

  // Auto switch tab when new artifacts arrive
  useEffect(() => {
    if (checkResult) {
      setActiveTab('grader');
    } else if (imageArtifacts.length > 0) {
      setActiveTab('image');
    } else if (tableArtifact) {
      setActiveTab('table');
    } else if (runResult || isRunning) {
      setActiveTab('console');
    }
  }, [runResult, checkResult, imageArtifacts.length, isRunning]);

  // Combined console output from stream or run result
  const displayResult = runResult || (isRunning ? {
    stdout: streamingStdout,
    stderr: streamingStderr,
    durationMs: 0,
    artifacts: [],
  } : null);

  return (
    <div className="h-full flex flex-col bg-dark-900 border-t border-slate-800 overflow-hidden">
      {/* Output Tabs Header */}
      <div className="h-10 bg-dark-850 border-b border-slate-800 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Console Tab */}
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'console'
                ? 'bg-dark-950 text-slate-100 border border-slate-750 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
            }`}
          >
            <Terminal size={13} className="text-brand-400" />
            <span>Konsol Output</span>
            {isRunning && <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />}
          </button>

          {/* Matplotlib Image Tab */}
          {imageArtifacts.length > 0 && (
            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
                activeTab === 'image'
                  ? 'bg-dark-950 text-slate-100 border border-slate-750 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
              }`}
            >
              <ImageIcon size={13} className="text-emerald-400" />
              <span>Grafik Plot ({imageArtifacts.length})</span>
            </button>
          )}

          {/* Table Tab */}
          {tableArtifact && (
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
                activeTab === 'table'
                  ? 'bg-dark-950 text-slate-100 border border-slate-750 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
              }`}
            >
              <TableIcon size={13} className="text-cyan-400" />
              <span>Tabel Data</span>
            </button>
          )}

          {/* JSON Tab */}
          {jsonArtifact && (
            <button
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
                activeTab === 'json'
                  ? 'bg-dark-950 text-slate-100 border border-slate-750 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
              }`}
            >
              <FileJson size={13} className="text-indigo-400" />
              <span>JSON State</span>
            </button>
          )}

          {/* Grader Tab */}
          <button
            onClick={() => setActiveTab('grader')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'grader'
                ? 'bg-dark-950 text-slate-100 border border-slate-750 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800'
            }`}
          >
            <Award size={13} className={checkResult?.passed ? 'text-emerald-400' : 'text-amber-400'} />
            <span>Hasil Grader</span>
            {checkResult && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  checkResult.passed ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
            )}
          </button>
        </div>

        {runResult && (
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            Eksekusi: {runResult.durationMs}ms
          </span>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden bg-dark-950">
        {activeTab === 'console' && (
          <ConsoleOutput runResult={displayResult} isRunning={isRunning} />
        )}

        {activeTab === 'image' && imageArtifacts.length > 0 && (
          <div className="h-full p-4 overflow-y-auto space-y-4">
            {imageArtifacts.map((art, idx) => (
              <div
                key={idx}
                className="p-3 bg-dark-900 border border-slate-800 rounded-xl shadow-lg space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-emerald-400" />
                    {art.title || `Plot #${idx + 1}`}
                  </span>

                  <a
                    href={String(art.data)}
                    download={`plot_${idx + 1}.png`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-dark-800 hover:bg-slate-750 text-slate-300 text-[11px] font-mono transition-colors"
                  >
                    <Download size={11} />
                    <span>Unduh PNG</span>
                  </a>
                </div>

                <div className="flex justify-center bg-white rounded-lg p-2 overflow-auto">
                  <img
                    src={String(art.data)}
                    alt={art.title || 'Matplotlib Plot'}
                    className="max-h-[380px] w-auto object-contain rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'table' && tableArtifact && (
          <TableArtifact
            data={tableArtifact.data as TableArtifactData}
            title={tableArtifact.title}
          />
        )}

        {activeTab === 'json' && jsonArtifact && (
          <div className="h-full p-4 overflow-auto font-mono text-xs text-slate-200">
            <pre className="p-3 bg-dark-900 border border-slate-800 rounded-lg text-indigo-300">
              {JSON.stringify(jsonArtifact.data, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'grader' && (
          <GraderResult
            checkResult={checkResult}
            onNextExercise={onNextExercise}
            hasNextExercise={hasNextExercise}
          />
        )}
      </div>
    </div>
  );
};
