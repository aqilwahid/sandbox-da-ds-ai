import React, { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Trash2, Upload, User } from 'lucide-react';
import { exercisesByTrack } from '../content/loader';
import { TRACK_IDS, TRACKS } from '../content/types';
import { resetAllProgress } from '../db';
import { exportProgressToCsv, exportProgressToJson, importProgressFromJson } from '../db/exportImport';
import { useAllProgress } from '../db/hooks';
import { formatRelativeTime } from '../lib/format';
import { setPref, usePrefs } from '../lib/prefs';
import { navigate } from '../lib/router';
import { StatusIcon } from '../components/layout/Sidebar';
import { useToast } from '../components/layout/Toast';

const STATUS_LABEL: Record<string, string> = { lulus: 'Lulus', 'lihat-solusi': 'Solusi dilihat', dicoba: 'Dikerjakan', belum: 'Belum' };

export const ProgressPage: React.FC = () => {
  const progress = useAllProgress();
  const prefs = usePrefs();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const r = await importProgressFromJson(await f.text());
      showToast(`${r.count} catatan progres berhasil diimpor.`, 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-fg">Progres belajar</h1>
            <p className="mt-1 text-xs text-fg2">Tersimpan di browser perangkat ini. Ekspor untuk dikirim ke trainer atau dipindahkan ke perangkat lain.</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-fg2">
            <User size={14} className="text-fg3" />
            <input
              className="input w-56"
              placeholder="Nama peserta (untuk file ekspor)"
              value={prefs.participantName}
              onChange={(e) => setPref('participantName', e.target.value)}
              aria-label="Nama peserta"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {TRACK_IDS.map((t) => {
            const list = exercisesByTrack(t);
            const passed = list.filter((e) => progress[e.id]?.status === 'lulus').length;
            const pct = list.length ? passed / list.length : 0;
            return (
              <div key={t} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-fg">{TRACKS[t].name}</span>
                  <span className="text-2xs text-fg3 tabular">
                    {passed}/{list.length}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-semibold text-fg tabular">{Math.round(pct * 100)}%</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel3">
                  <div className="h-full rounded-full bg-ok" style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => exportProgressToJson().then(() => showToast('File JSON progres diunduh.', 'success'))}>
            <Download size={13} /> Ekspor JSON (cadangan)
          </button>
          <button type="button" className="btn" onClick={() => exportProgressToCsv().then(() => showToast('File CSV progres diunduh.', 'success'))}>
            <FileSpreadsheet size={13} /> Ekspor CSV (rekap trainer)
          </button>
          <button type="button" className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> Impor JSON
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onImport} />
          <button
            type="button"
            className="btn ml-auto !text-err"
            onClick={async () => {
              if (!window.confirm('Hapus SEMUA progres dan kode tersimpan di browser ini? Tindakan ini tidak bisa dibatalkan.')) return;
              await resetAllProgress();
              showToast('Semua progres dihapus.', 'info');
            }}
          >
            <Trash2 size={13} /> Reset semua
          </button>
        </div>

        {TRACK_IDS.map((t) => (
          <section key={t} className="card overflow-hidden">
            <header className="border-b border-line bg-panel2 px-4 py-2.5 text-xs font-semibold text-fg">{TRACKS[t].name}</header>
            <table className="w-full text-left text-xs">
              <thead className="text-2xs text-fg3">
                <tr>
                  <th className="px-4 py-2 font-medium">Latihan</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Kriteria</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Jalan</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Hint</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {exercisesByTrack(t).map((e, i) => {
                  const p = progress[e.id];
                  return (
                    <tr key={e.id} className="border-t border-line hover:bg-panel3/50">
                      <td className="px-4 py-2">
                        <button type="button" className="text-left text-fg hover:text-accent" onClick={() => navigate({ name: 'exercise', id: e.id })}>
                          <span className="text-fg3 tabular">{i + 1}.</span> {e.frontmatter.title}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-fg2">
                          <StatusIcon status={p?.status} size={13} /> {STATUS_LABEL[p?.status || 'belum']}
                          {p?.solutionViewed && p.status === 'lulus' && <span className="text-2xs text-fg3">(solusi dilihat)</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-fg2 tabular">{p?.lastScore ? `${p.lastScore.passed}/${p.lastScore.total}` : '—'}</td>
                      <td className="hidden px-3 py-2 text-fg2 tabular sm:table-cell">{p?.attemptsCount || 0}×</td>
                      <td className="hidden px-3 py-2 text-fg2 tabular sm:table-cell">{p?.hintsUsed || 0}</td>
                      <td className="hidden px-3 py-2 text-fg3 md:table-cell">{p?.updatedAt ? formatRelativeTime(p.updatedAt) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
};
