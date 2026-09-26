import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Database, Hash, Loader2, ToggleLeft, Type } from 'lucide-react';
import { getContent } from '../../content/loader';
import { profileColumns, parseCsv, type ColumnProfile, type ParsedCsv } from '../../lib/csv';
import { formatCompact, formatNumber } from '../../lib/format';
import type { DatasetRef } from '../../runtime/types';
import { DataTable } from '../output/DataTable';

const cache = new Map<string, Promise<ParsedCsv>>();
function loadCsv(url: string) {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return parseCsv(await r.text());
      }),
    );
  }
  return cache.get(url)!;
}

const KindIcon: React.FC<{ kind: string }> = ({ kind }) => {
  const cls = 'shrink-0 text-fg3';
  if (kind === 'number') return <Hash size={12} className={cls} />;
  if (kind === 'date') return <Calendar size={12} className={cls} />;
  if (kind === 'bool') return <ToggleLeft size={12} className={cls} />;
  return <Type size={12} className={cls} />;
};

const KIND_LABEL: Record<string, string> = { number: 'angka', text: 'teks', date: 'tanggal', bool: 'boolean' };

const MiniHist: React.FC<{ bins: number[] }> = ({ bins }) => {
  const max = Math.max(...bins, 1);
  return (
    <svg width={96} height={24} aria-hidden className="shrink-0">
      {bins.map((b, i) => (
        <rect key={i} x={i * 8} y={24 - (b / max) * 22} width={7} height={(b / max) * 22} rx={1} fill="var(--series-1)" opacity={0.85} />
      ))}
    </svg>
  );
};

const TopBars: React.FC<{ top: { value: string; count: number }[]; total: number }> = ({ top, total }) => (
  <div className="w-full space-y-0.5">
    {top.slice(0, 3).map((t) => (
      <div key={t.value} className="flex items-center gap-1.5 text-[10.5px]">
        <span className="w-24 truncate text-fg2" title={t.value}>
          {t.value}
        </span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel3">
          <span className="block h-full rounded-full" style={{ width: `${(t.count / total) * 100}%`, background: 'var(--series-1)' }} />
        </span>
        <span className="w-7 text-right text-fg3 tabular">{t.count}</span>
      </div>
    ))}
  </div>
);

const ColumnRow: React.FC<{ p: ColumnProfile; desc?: string; total: number }> = ({ p, desc, total }) => (
  <div className="grid grid-cols-1 gap-x-3 gap-y-1 border-b border-line/70 px-3 py-2 last:border-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <KindIcon kind={p.kind} />
        <code className="truncate font-mono text-xs font-semibold text-fg">{p.name}</code>
        <span className="rounded bg-panel3 px-1 text-[10px] text-fg3">{KIND_LABEL[p.kind]}</span>
        {p.missing > 0 && <span className="rounded bg-warn/15 px-1 text-[10px] font-medium text-warn">{p.missing} kosong</span>}
      </div>
      {desc && <div className="mt-0.5 text-2xs leading-snug text-fg2">{desc}</div>}
    </div>
    <div className="flex min-w-0 items-center gap-2 text-[10.5px] text-fg3">
      {p.kind === 'number' && p.histogram ? (
        <>
          <MiniHist bins={p.histogram} />
          <span className="truncate tabular">
            {formatCompact(p.min as number)} – {formatCompact(p.max as number)} · median {formatCompact(p.median as number)}
          </span>
        </>
      ) : p.kind === 'date' ? (
        <span className="tabular">
          {String(p.min)} s/d {String(p.max)}
        </span>
      ) : p.top ? (
        p.unique <= 12 ? (
          <TopBars top={p.top} total={total - p.missing} />
        ) : (
          <span>
            {formatNumber(p.unique)} nilai unik · mis. "{p.top[0]?.value}"
          </span>
        )
      ) : null}
    </div>
  </div>
);

const OneDataset: React.FC<{ ds: DatasetRef; language: 'sql' | 'python' }> = ({ ds, language }) => {
  const info = getContent().datasets[ds.name];
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'kolom' | 'pratinjau'>('kolom');
  useEffect(() => {
    let alive = true;
    setCsv(null);
    loadCsv(ds.url)
      .then((c) => alive && setCsv(c))
      .catch((e) => alive && setError(String(e.message || e)));
    return () => {
      alive = false;
    };
  }, [ds.url]);
  const profiles = useMemo(() => (csv ? profileColumns(csv) : []), [csv]);
  const desc = Object.fromEntries((info?.columns || []).map((c) => [c.name, c.description]));
  const missing = profiles.reduce((s, p) => s + p.missing, 0);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-panel shadow-card">
      <header className="border-b border-line bg-panel2 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Database size={14} className="text-accent" />
          <code className="font-mono text-sm font-semibold text-fg">{language === 'sql' ? ds.name : ds.file}</code>
          <span className="text-xs text-fg2">{info?.title}</span>
        </div>
        {info?.description && <p className="mt-1 text-2xs leading-relaxed text-fg2">{info.description}</p>}
        {csv && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="chip tabular">{formatNumber(csv.rows.length)} baris</span>
            <span className="chip tabular">{csv.columns.length} kolom</span>
            <span className={`chip tabular ${missing ? '!border-warn/40 !text-warn' : ''}`}>{missing ? `${missing} sel kosong` : 'tanpa sel kosong'}</span>
            <span className="chip font-mono">{language === 'sql' ? `FROM ${ds.name}` : `pd.read_csv("${ds.file}")`}</span>
          </div>
        )}
      </header>
      {!csv && !error && (
        <div className="flex items-center gap-2 p-4 text-xs text-fg3">
          <Loader2 size={13} className="animate-spin" /> Membaca data…
        </div>
      )}
      {error && <div className="p-4 text-xs text-err">Gagal membaca dataset: {error}</div>}
      {csv && (
        <>
          <div className="flex gap-1 border-b border-line px-2 py-1">
            <button type="button" className={`tab ${view === 'kolom' ? 'tab-active' : ''}`} onClick={() => setView('kolom')}>
              Kolom & profil
            </button>
            <button type="button" className={`tab ${view === 'pratinjau' ? 'tab-active' : ''}`} onClick={() => setView('pratinjau')}>
              Pratinjau data
            </button>
          </div>
          {view === 'kolom' ? (
            <div>
              {profiles.map((p) => (
                <ColumnRow key={p.name} p={p} desc={desc[p.name]} total={csv.rows.length} />
              ))}
            </div>
          ) : (
            <DataTable
              table={{ columns: csv.columns, kinds: csv.kinds, rows: csv.rows.slice(0, 200), source: 'csv' }}
              maxHeight={420}
              descriptions={desc}
            />
          )}
        </>
      )}
    </section>
  );
};

export const DatasetExplorer: React.FC<{ datasets: DatasetRef[]; language: 'sql' | 'python' }> = ({ datasets, language }) => {
  if (!datasets.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-xs text-fg3">
        <Database size={20} />
        Latihan ini tidak memakai dataset — datanya ditulis langsung di kode.
      </div>
    );
  }
  return (
    <div className="space-y-4 p-4">
      <p className="text-2xs text-fg2">
        {language === 'sql'
          ? 'Tabel yang bisa dipakai di kueri latihan ini. Arahkan kursor ke nama kolom di pratinjau untuk melihat artinya.'
          : 'File yang tersedia di folder kerja Python. Baca dengan pandas sesuai nama file.'}
      </p>
      {datasets.map((d) => (
        <OneDataset key={d.name} ds={d} language={language} />
      ))}
      <p className="text-[10.5px] text-fg3">Semua data bersifat fiktif (sintetis) untuk keperluan latihan.</p>
    </div>
  );
};
