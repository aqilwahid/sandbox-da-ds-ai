import React from 'react';
import { Braces, FileText, Info, Loader2, Play } from 'lucide-react';
import type { DisplayItem, RunResult } from '../../runtime/types';
import { ErrorExplainer } from './ErrorExplainer';
import { JsonTree } from './JsonTree';
import { TableCard } from './TableCard';

export const DisplayBlock: React.FC<{ item: DisplayItem }> = ({ item }) => {
  if (item.type === 'table') return <TableCard table={item} />;
  if (item.type === 'json') {
    return (
      <section className="overflow-hidden rounded-xl border border-line bg-panel shadow-card">
        <header className="flex items-center gap-2 border-b border-line bg-panel2 px-3 py-1.5 text-xs font-semibold text-fg">
          <Braces size={13} className="text-accent" /> {item.title || (item.auto ? 'Nilai baris terakhir' : 'Data')}
        </header>
        <JsonTree data={item.data} />
      </section>
    );
  }
  if (item.type === 'image') {
    return (
      <figure className="rounded-xl border border-line bg-white p-2">
        <img src={item.data} alt={item.title || 'Grafik'} className="mx-auto max-h-[420px]" />
      </figure>
    );
  }
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-panel">
      {(item.title || item.auto) && (
        <header className="flex items-center gap-2 border-b border-line bg-panel2 px-3 py-1.5 text-xs font-semibold text-fg">
          <FileText size={13} className="text-accent" /> {item.title || 'Nilai baris terakhir'}
        </header>
      )}
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs text-fg">{item.text}</pre>
    </section>
  );
};

interface Props {
  result: RunResult | null;
  running: boolean;
  liveStdout: string;
  language: 'sql' | 'python';
  onJumpToLine?: (line: number) => void;
  onRun?: () => void;
}

export const ResultsView: React.FC<Props> = ({ result, running, liveStdout, language, onJumpToLine, onRun }) => {
  if (running) {
    return (
      <div className="space-y-3 p-3">
        <div className="flex items-center gap-2 text-xs text-fg2">
          <Loader2 size={14} className="animate-spin text-accent" /> Menjalankan kode di browser…
        </div>
        {liveStdout && (
          <pre className="max-h-64 overflow-auto rounded-lg border border-line bg-panel2 p-3 font-mono text-xs text-fg">{liveStdout}</pre>
        )}
      </div>
    );
  }
  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Play size={18} />
        </div>
        <p className="max-w-xs text-xs text-fg2">
          Tekan <strong className="text-fg">Jalankan</strong> atau <span className="kbd">Ctrl</span> + <span className="kbd">Enter</span>. Hasil{' '}
          {language === 'sql' ? 'kueri' : 'kode'} akan tampil di sini sebagai tabel & grafik.
        </p>
        {onRun && (
          <button type="button" onClick={onRun} className="btn-primary mt-1">
            <Play size={13} className="fill-current" /> Jalankan
          </button>
        )}
      </div>
    );
  }
  const displays = result.displays || [];
  return (
    <div className="space-y-3 p-3">
      {result.error && <ErrorExplainer error={result.error} onJumpToLine={onJumpToLine} />}
      {displays.map((d, i) => (
        <DisplayBlock key={i} item={d} />
      ))}
      {!result.error && displays.length === 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-line bg-panel2 p-3 text-xs text-fg2">
          <Info size={14} className="mt-0.5 shrink-0 text-info" />
          <div>
            Kode selesai tanpa tabel untuk ditampilkan.
            {language === 'python' && (
              <>
                {' '}
                Tulis nama variabel (mis. <code className="font-mono">df</code>) di <strong>baris terakhir</strong>, atau pakai{' '}
                <code className="font-mono">tampilkan(df)</code>, untuk melihatnya sebagai tabel. Output <code className="font-mono">print</code> ada di tab
                Konsol{result.figures?.length ? ', grafik ada di tab Grafik' : ''}.
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
