import React, { useState } from 'react';
import { CheckCircle2, CircleDashed, Cpu, Database, HardDrive, Loader2, Package, PlayCircle, RefreshCw, Server, TriangleAlert, WifiOff, XCircle } from 'lucide-react';
import { CDN_PACKAGE_BASE, PYODIDE_VERSION } from '../config';
import { allDatasetRefs, allPackages } from '../content/loader';
import { formatDuration } from '../lib/format';
import { setPref, usePrefs } from '../lib/prefs';
import { pythonRuntime, useRuntimeState } from '../runtime/pythonRuntime';
import { ProgressBar } from '../components/common/ProgressBar';

type Status = 'idle' | 'running' | 'ok' | 'warn' | 'error';
interface Step {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  status: Status;
  detail?: string;
  sub?: { name: string; ok: boolean; detail: string }[];
}

const INITIAL: Step[] = [
  { id: 'browser', title: 'Kemampuan browser', desc: 'WebAssembly, Web Worker, dan penyimpanan lokal (IndexedDB).', icon: <Cpu size={16} />, status: 'idle' },
  { id: 'sw', title: 'Mode offline', desc: 'Service worker menyimpan aplikasi agar tetap bisa dibuka tanpa internet.', icon: <WifiOff size={16} />, status: 'idle' },
  { id: 'python', title: 'Mesin Python (Pyodide)', desc: 'Memuat CPython dalam WebAssembly (±12 MB, sekali unduh).', icon: <Server size={16} />, status: 'idle' },
  { id: 'packages', title: 'Pustaka data & AI', desc: 'pandas, matplotlib, scikit-learn, DuckDB, dll. yang dipakai latihan.', icon: <Package size={16} />, status: 'idle' },
  { id: 'datasets', title: 'Dataset latihan', desc: 'File CSV yang dipakai di semua latihan.', icon: <Database size={16} />, status: 'idle' },
  { id: 'smoke', title: 'Uji fungsi', desc: 'Menjalankan SQL, pandas, grafik, dan model kecil.', icon: <PlayCircle size={16} />, status: 'idle' },
];

const Icon: React.FC<{ s: Status }> = ({ s }) => {
  if (s === 'ok') return <CheckCircle2 size={18} className="text-ok" />;
  if (s === 'warn') return <TriangleAlert size={18} className="text-warn" />;
  if (s === 'error') return <XCircle size={18} className="text-err" />;
  if (s === 'running') return <Loader2 size={18} className="animate-spin text-accent" />;
  return <CircleDashed size={18} className="text-fg3" />;
};

export const PreflightPage: React.FC = () => {
  const [steps, setSteps] = useState<Step[]>(INITIAL);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ pct: number | null; msg: string } | null>(null);
  const [storage, setStorage] = useState<string>('');
  const rt = useRuntimeState();
  const prefs = usePrefs();
  const [source, setSource] = useState(prefs.packageSource);

  const upd = (id: string, patch: Partial<Step>) => setSteps((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const runAll = async () => {
    setRunning(true);
    setSteps(INITIAL);
    // 1. Browser
    upd('browser', { status: 'running' });
    const missing: string[] = [];
    if (typeof WebAssembly === 'undefined') missing.push('WebAssembly');
    if (typeof Worker === 'undefined') missing.push('Web Worker');
    let idbOk = false;
    try {
      await new Promise<void>((res, rej) => {
        const r = indexedDB.open('sbx-preflight-test');
        r.onsuccess = () => {
          r.result.close();
          indexedDB.deleteDatabase('sbx-preflight-test');
          res();
        };
        r.onerror = () => rej(r.error);
      });
      idbOk = true;
    } catch {
      missing.push('IndexedDB (progres tidak akan tersimpan)');
    }
    try {
      const est = await navigator.storage?.estimate?.();
      if (est) setStorage(`${Math.round((est.usage || 0) / 1048576)} MB terpakai dari ±${Math.round((est.quota || 0) / 1048576)} MB`);
      await navigator.storage?.persist?.();
    } catch {
      /* abaikan */
    }
    upd('browser', {
      status: missing.length ? (idbOk ? 'error' : 'warn') : 'ok',
      detail: missing.length ? `Tidak tersedia: ${missing.join(', ')}. Gunakan Chrome/Edge/Firefox versi terbaru.` : 'Semua fitur yang dibutuhkan tersedia.',
    });

    // 2. Service worker
    upd('sw', { status: 'running' });
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      upd('sw', {
        status: 'warn',
        detail: window.isSecureContext
          ? 'Browser tidak mendukung service worker. Aplikasi tetap jalan selama server bisa diakses.'
          : 'Halaman dibuka lewat http (mis. IP laptop trainer), jadi mode offline browser tidak aktif. Tidak masalah selama server kelas menyala.',
      });
    } else {
      const sleep = (ms: number) => new Promise<undefined>((r) => setTimeout(() => r(undefined), ms));
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        await sleep(1500); // pendaftaran service worker berjalan asinkron setelah halaman dimuat
        reg = await navigator.serviceWorker.getRegistration();
      }
      if (!reg) {
        upd('sw', { status: 'warn', detail: 'Belum aktif (normal saat `npm run dev`). Pada versi build (`npm run build`) akan aktif otomatis.' });
      } else {
        upd('sw', { status: 'running', detail: 'Menyimpan aplikasi untuk offline…' });
        const ready = await Promise.race([navigator.serviceWorker.ready, sleep(60000)]);
        const controlled =
          !!ready?.active &&
          (!!navigator.serviceWorker.controller ||
            (await Promise.race([
              new Promise<boolean>((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r(true), { once: true })),
              sleep(10000).then(() => !!navigator.serviceWorker.controller),
            ])));
        if (controlled) {
          // Worker Python yang terlanjur dibuat sebelum service worker aktif dimuat ulang,
          // agar paket yang diunduh setelah ini ikut tersimpan untuk offline.
          const restarted = await pythonRuntime.ensureOfflineCapture();
          upd('sw', {
            status: 'ok',
            detail:
              'Aktif — aplikasi & paket yang diunduh tersimpan untuk dipakai offline.' +
              (restarted ? ' Python dimuat ulang sekali agar unduhan paketnya ikut tersimpan.' : ''),
          });
        } else {
          upd('sw', { status: 'warn', detail: 'Belum selesai terpasang (koneksi lambat?). Muat ulang halaman, lalu jalankan Cek Kesiapan sekali lagi.' });
        }
      }
    }

    // 3. Python
    upd('python', { status: 'running' });
    const t0 = performance.now();
    try {
      await pythonRuntime.ensureReady();
      const st = pythonRuntime.getState();
      upd('python', {
        status: 'ok',
        detail: `Python ${st.pythonVersion} siap dalam ${formatDuration(performance.now() - t0)}. Sumber paket: ${
          st.packageSource === 'lokal' ? 'server lokal (offline)' : 'CDN jsDelivr (internet)'
        }.`,
      });
    } catch (e) {
      upd('python', { status: 'error', detail: (e as Error).message });
      setRunning(false);
      return;
    }

    // 4. Packages
    const pkgs = allPackages();
    upd('packages', { status: 'running', detail: pkgs.join(', ') });
    const t1 = performance.now();
    try {
      await pythonRuntime.loadPackages(pkgs, (msg, pct) => setProgress({ msg, pct: pct ?? null }));
      upd('packages', { status: 'ok', detail: `${pkgs.length} paket siap (${pkgs.join(', ')}) dalam ${formatDuration(performance.now() - t1)}.` });
    } catch (e) {
      upd('packages', { status: 'error', detail: (e as Error).message });
    }
    setProgress(null);

    // 5. Datasets
    upd('datasets', { status: 'running' });
    const refs = allDatasetRefs();
    const failed: string[] = [];
    await Promise.all(
      refs.map(async (d) => {
        try {
          const r = await fetch(d.url);
          if (!r.ok) failed.push(d.file);
          else await r.arrayBuffer();
        } catch {
          failed.push(d.file);
        }
      }),
    );
    upd('datasets', {
      status: failed.length ? 'error' : 'ok',
      detail: failed.length ? `Gagal: ${failed.join(', ')}` : `${refs.length} dataset tersedia (${refs.map((d) => d.file).join(', ')}).`,
    });

    // 6. Smoke
    upd('smoke', { status: 'running' });
    try {
      const r = await pythonRuntime.smokeTest(refs);
      upd('smoke', { status: r.checks.every((c) => c.ok) ? 'ok' : 'error', sub: r.checks });
    } catch (e) {
      upd('smoke', { status: 'error', detail: (e as Error).message });
    }
    setRunning(false);
  };

  const hardFail = steps.some((s) => s.status === 'error');
  const done = steps.every((s) => s.status === 'ok' || s.status === 'warn');
  const offlineReady = done && steps.find((s) => s.id === 'sw')?.status === 'ok';

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-5 px-5 py-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Cek kesiapan perangkat</h1>
          <p className="mt-1 text-xs leading-relaxed text-fg2">
            Jalankan sekali di setiap laptop peserta <strong className="text-fg">sebelum kelas dimulai</strong> (saat masih terhubung ke internet atau server
            kelas). Semua mesin & pustaka akan diunduh dan disimpan sehingga latihan langsung jalan tanpa menunggu.
          </p>
        </div>

        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-xs text-fg2">
            <div className="flex items-center gap-2 font-semibold text-fg">
              <HardDrive size={14} /> {storage || 'Penyimpanan browser'}
            </div>
            <div className="mt-0.5">
              Pyodide {PYODIDE_VERSION} · paket dari{' '}
              <strong className="text-fg">{rt.packageSource === 'lokal' ? 'server lokal' : rt.packageSource === 'cdn' ? 'CDN' : 'otomatis'}</strong>
            </div>
          </div>
          <button type="button" className="btn-primary !px-4 !py-2" disabled={running} onClick={runAll}>
            {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {running ? 'Sedang memeriksa…' : 'Mulai pemeriksaan'}
          </button>
        </div>

        {progress && <ProgressBar value={progress.pct} label={progress.msg} />}

        <ol className="space-y-2">
          {steps.map((s) => (
            <li key={s.id} className={`card p-3.5 ${s.status === 'error' ? '!border-err/50' : s.status === 'ok' ? '!border-ok/35' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5">
                  <Icon s={s.status} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <span className="text-fg3">{s.icon}</span> {s.title}
                  </div>
                  <p className="text-2xs text-fg3">{s.desc}</p>
                  {s.detail && <p className="mt-1 text-xs text-fg2">{s.detail}</p>}
                  {s.sub && (
                    <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                      {s.sub.map((c) => (
                        <li key={c.name} className="flex items-start gap-1.5 text-2xs text-fg2">
                          {c.ok ? <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-ok" /> : <XCircle size={12} className="mt-0.5 shrink-0 text-err" />}
                          <span>
                            <strong className="text-fg">{c.name}</strong>: {c.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {done && (
          <div className="rounded-xl border border-ok/40 bg-ok/10 p-4 text-sm text-fg">
            <strong>Perangkat siap dipakai ✓</strong>{' '}
            {offlineReady ? 'Termasuk mode offline — latihan tetap berjalan walau internet terputus.' : 'Pastikan server kelas / internet tetap tersedia saat membuka aplikasi.'}
          </div>
        )}
        {hardFail && !running && (
          <div className="rounded-xl border border-err/40 bg-err/10 p-4 text-xs leading-relaxed text-fg">
            <strong>Ada pemeriksaan yang gagal.</strong> Coba muat ulang halaman dan ulangi. Jika paket gagal diunduh dari CDN, minta trainer menyiapkan paket lokal
            (<code className="font-mono">npm run setup:offline</code>) lalu pilih sumber paket "Server lokal" di bawah.
          </div>
        )}

        <details className="card p-4 text-xs text-fg2">
          <summary className="cursor-pointer font-semibold text-fg">Pengaturan lanjutan: sumber paket Python</summary>
          <p className="mt-2 leading-relaxed">
            <strong className="text-fg">Otomatis</strong> memakai paket lokal jika trainer sudah menjalankan <code className="font-mono">npm run setup:offline</code>, dan
            CDN jika belum. CDN: <code className="break-all font-mono">{CDN_PACKAGE_BASE}</code>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(['auto', 'lokal', 'cdn'] as const).map((opt) => (
              <label key={opt} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${source === opt ? 'border-accent bg-accent/10 text-fg' : 'border-line'}`}>
                <input type="radio" name="src" checked={source === opt} onChange={() => setSource(opt)} />
                {opt === 'auto' ? 'Otomatis' : opt === 'lokal' ? 'Server lokal (offline)' : 'CDN (internet)'}
              </label>
            ))}
            <button
              type="button"
              className="btn"
              disabled={source === prefs.packageSource}
              onClick={() => {
                setPref('packageSource', source);
                location.reload();
              }}
            >
              Terapkan & muat ulang
            </button>
          </div>
        </details>
      </div>
    </div>
  );
};
