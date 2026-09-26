import { useSyncExternalStore } from 'react';
import { absoluteUrl, CDN_PACKAGE_BASE, PYODIDE_VERSION } from '../config';
import { getPrefs } from '../lib/prefs';
import type { Language } from '../content/types';
import type {
  CheckResult,
  DatasetRef,
  DisplayItem,
  PrepareRequest,
  RunResult,
  RuntimeState,
  TableDisplay,
  TableSchema,
} from './types';

type Pending = {
  resolve: (v: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  reject: (e: Error) => void;
  onStream?: (kind: 'stdout' | 'stderr', text: string) => void;
  onStarted?: () => void;
  onProgress?: (msg: string, pct?: number) => void;
};

export class RuntimeRestartedError extends Error {
  constructor() {
    super('Runtime dimulai ulang');
  }
}

/**
 * Pengelola tunggal Web Worker Python.
 * - Memuat Pyodide sekali, lalu menyiapkan paket & dataset per latihan.
 * - Menangani batas waktu & tombol Stop: interrupt lembut (jika browser mendukung),
 *   atau matikan & muat ulang worker lalu siapkan kembali latihan terakhir.
 */
class PythonRuntime {
  private worker: Worker | null = null;
  private pending = new Map<string, Pending>();
  private seq = 0;
  private initPromise: Promise<void> | null = null;
  private lastPrepare: PrepareRequest | null = null;
  private preparedKey: string | null = null;
  private preparing: Promise<void> | null = null;
  private interrupt: Int32Array | null = null;
  private listeners = new Set<() => void>();
  private runningId: string | null = null;
  private stopReason: 'timeout' | 'user' | null = null;
  private state: RuntimeState = {
    status: 'idle',
    message: 'Python belum dimuat',
    progress: null,
    packageSource: null,
    packageBase: null,
    loadedPackages: [],
    error: null,
    canInterrupt: false,
    pythonVersion: null,
    restarts: 0,
  };

  // ---------- store (useSyncExternalStore)
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  getState = () => this.state;
  private set(patch: Partial<RuntimeState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  // ---------- worker plumbing
  private nextId(prefix: string) {
    return `${prefix}_${++this.seq}`;
  }

  /** Apakah worker saat ini dibuat ketika halaman sudah dikendalikan service worker (unduhan paket ikut di-cache). */
  private workerControlled = false;

  private createWorker() {
    this.workerControlled = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;
    const w = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e) => this.onMessage(e.data);
    w.onerror = (e) => {
      console.error('Worker error', e);
      const err = new Error(e.message || 'Worker Python berhenti tak terduga');
      this.pending.forEach((p) => p.reject(err));
      this.pending.clear();
      this.set({ status: 'error', error: err.message, message: 'Python berhenti tak terduga' });
    };
    return w;
  }

  private onMessage(data: { type: string; id: string; [k: string]: any }) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const p = this.pending.get(data.id);
    switch (data.type) {
      case 'progress':
        if (p?.onProgress) p.onProgress(data.msg, data.pct);
        if (this.state.status === 'loading' || !p?.onStream) {
          this.set({ message: data.msg, progress: typeof data.pct === 'number' ? data.pct : this.state.progress });
        } else {
          this.set({ message: data.msg });
        }
        return;
      case 'stream':
        this.pending.get(data.id)?.onStream?.(data.kind, data.text);
        return;
      case 'started':
        p?.onStarted?.();
        return;
      case 'done':
        if (p) {
          this.pending.delete(data.id);
          p.resolve(data.result);
        }
        return;
      case 'error':
        if (p) {
          this.pending.delete(data.id);
          p.reject(new Error(data.error));
        }
        return;
    }
  }

  private call<T>(msg: Record<string, unknown>, handlers: Omit<Pending, 'resolve' | 'reject'> = {}): Promise<T> {
    if (!this.worker) return Promise.reject(new Error('Python belum dimuat'));
    const id = (msg.id as string) || this.nextId(String(msg.type));
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, ...handlers });
      this.worker!.postMessage({ ...msg, id });
    });
  }

  // ---------- lifecycle
  private async resolvePackageBase(): Promise<{ url: string; source: 'lokal' | 'cdn' }> {
    const local = absoluteUrl('pyodide/');
    let pref: string = getPrefs().packageSource;
    try {
      const q = new URLSearchParams(self.location.search).get('paket');
      if (q === 'lokal' || q === 'cdn') pref = q;
    } catch {
      /* abaikan */
    }
    if (pref === 'cdn') return { url: CDN_PACKAGE_BASE, source: 'cdn' };
    try {
      const res = await fetch(local + 'offline-manifest.json', { cache: 'no-cache' });
      if (res.ok) {
        const manifest = await res.json();
        if (manifest?.version === PYODIDE_VERSION) return { url: local, source: 'lokal' };
      }
    } catch {
      /* tidak ada paket lokal */
    }
    if (pref === 'lokal') return { url: local, source: 'lokal' };
    return { url: CDN_PACKAGE_BASE, source: 'cdn' };
  }

  ensureReady(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      this.set({ status: 'loading', message: 'Menyiapkan Python…', progress: 3, error: null });
      try {
        const base = await this.resolvePackageBase();
        this.set({ packageSource: base.source, packageBase: base.url });
        this.worker = this.createWorker();
        let buffer: Int32Array | undefined;
        if (typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated) {
          buffer = new Int32Array(new SharedArrayBuffer(4));
          this.interrupt = buffer;
        }
        const info = await this.call<{ python: string; canInterrupt: boolean }>({
          type: 'init',
          indexURL: absoluteUrl('pyodide/'),
          packageBaseUrl: base.url,
          interruptBuffer: buffer,
        });
        this.set({
          status: 'ready',
          message: 'Python siap',
          progress: null,
          canInterrupt: info.canInterrupt,
          pythonVersion: info.python,
        });
      } catch (e) {
        const msg = (e as Error).message || String(e);
        this.initPromise = null;
        this.worker?.terminate();
        this.worker = null;
        this.set({
          status: 'error',
          message: 'Gagal memuat Python',
          error:
            msg +
            (this.state.packageSource === 'cdn'
              ? ' — periksa koneksi internet, atau gunakan paket lokal (lihat Panduan Trainer).'
              : ''),
          progress: null,
        });
        throw e;
      }
    })();
    return this.initPromise;
  }

  /** Siapkan paket & dataset untuk satu latihan (idempotent). */
  async prepare(req: PrepareRequest, onProgress?: (msg: string, pct?: number) => void): Promise<void> {
    this.lastPrepare = req;
    await this.ensureReady();
    if (this.preparedKey === req.key) return;
    if (this.preparing) {
      await this.preparing.catch(() => {});
      if (this.preparedKey === req.key) return;
    }
    this.set({ status: 'busy', message: 'Menyiapkan latihan…' });
    this.preparing = this.call<{ loaded: string[] }>(
      { type: 'prepare', language: req.language, packages: req.packages, datasets: req.datasets, warmup: req.warmup },
      { onProgress },
    ).then((r) => {
      this.preparedKey = req.key;
      this.set({ status: 'ready', message: 'Python siap', loadedPackages: r.loaded });
    });
    try {
      await this.preparing;
    } catch (e) {
      this.set({ status: 'ready', message: 'Python siap' });
      throw e;
    } finally {
      this.preparing = null;
    }
  }

  async run(
    opts: { language: Language; code: string; datasets: DatasetRef[]; timeoutSec: number },
    handlers: { onStream?: (kind: 'stdout' | 'stderr', text: string) => void; onProgress?: (m: string) => void } = {},
  ): Promise<RunResult> {
    await this.ensureReady();
    if (this.preparing) await this.preparing.catch(() => {});
    const id = this.nextId('run');
    this.runningId = id;
    this.stopReason = null;
    if (this.interrupt) Atomics.store(this.interrupt, 0, 0);
    this.set({ status: 'busy', message: 'Menjalankan kode…' });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stdout = '';
    let stderr = '';
    try {
      const result = await this.call<RunResult>(
        { id, type: 'run', language: opts.language, code: opts.code, datasets: opts.datasets, tables: opts.datasets.map((d) => d.name) },
        {
          onStream: (kind, text) => {
            if (kind === 'stderr') stderr += text;
            else stdout += text;
            handlers.onStream?.(kind, text);
          },
          onProgress: (m) => handlers.onProgress?.(m),
          onStarted: () => {
            timer = setTimeout(() => this.stop('timeout'), Math.max(3, opts.timeoutSec) * 1000);
          },
        },
      );
      return { ...result, stdout, stderr, stopped: this.stopReason };
    } catch (e) {
      if (e instanceof RuntimeRestartedError) {
        const timeout = this.stopReason === 'timeout';
        return {
          ok: false,
          language: opts.language,
          displays: [],
          figures: [],
          variables: [],
          durationMs: timeout ? opts.timeoutSec * 1000 : 0,
          stdout,
          stderr,
          stopped: this.stopReason,
          error: {
            type: timeout ? 'Timeout' : 'KeyboardInterrupt',
            title: timeout ? 'Batas waktu habis' : 'Eksekusi dihentikan',
            message: timeout
              ? `Kode berjalan lebih dari ${opts.timeoutSec} detik sehingga dihentikan otomatis.`
              : 'Eksekusi dihentikan lewat tombol Stop.',
            explanation:
              'Periksa perulangan yang tidak pernah berhenti (misalnya while True tanpa break) atau perhitungan yang terlalu berat. Runtime Python sudah dimuat ulang dan siap dipakai lagi.',
            language: opts.language,
          },
        };
      }
      throw e;
    } finally {
      if (timer) clearTimeout(timer);
      if (this.runningId === id) this.runningId = null;
      if (this.state.status === 'busy') this.set({ status: 'ready', message: 'Python siap' });
    }
  }

  /** Hentikan eksekusi yang sedang berjalan. */
  stop(reason: 'timeout' | 'user' = 'user') {
    const id = this.runningId;
    if (!id) return;
    this.stopReason = reason;
    if (this.interrupt) {
      Atomics.store(this.interrupt, 0, 2); // SIGINT → KeyboardInterrupt di Python
      setTimeout(() => {
        if (this.runningId === id) this.hardRestart();
      }, 2500);
    } else {
      this.hardRestart();
    }
  }

  /**
   * Pada kunjungan pertama, worker Python bisa terlanjur dibuat sebelum service worker aktif,
   * sehingga paket yang diunduhnya tidak tersimpan untuk offline. Jika halaman kini sudah
   * dikendalikan service worker, muat ulang worker agar unduhan berikutnya ikut di-cache.
   * @returns true jika worker dimuat ulang.
   */
  async ensureOfflineCapture(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return false;
    if (!this.worker || this.workerControlled) return false;
    await this.hardRestart();
    return true;
  }

  /** Matikan worker dan muat ulang (dipakai saat infinite loop tidak bisa di-interrupt). */
  async hardRestart() {
    const worker = this.worker;
    this.worker = null;
    worker?.terminate();
    const err = new RuntimeRestartedError();
    this.pending.forEach((p) => p.reject(err));
    this.pending.clear();
    this.runningId = null;
    this.initPromise = null;
    this.preparedKey = null;
    this.preparing = null;
    this.set({ status: 'loading', message: 'Memuat ulang Python…', progress: 5, restarts: this.state.restarts + 1 });
    try {
      await this.ensureReady();
      if (this.lastPrepare) await this.prepare(this.lastPrepare);
    } catch (e) {
      console.error('Gagal memuat ulang runtime', e);
    }
  }

  async check(opts: { language: Language; checker: string; solution: string; datasets: DatasetRef[] }): Promise<CheckResult> {
    await this.ensureReady();
    return this.call<CheckResult>({
      type: 'check',
      language: opts.language,
      checker: opts.checker,
      solution: opts.solution,
      tables: opts.datasets.map((d) => d.name),
    });
  }

  async expected(opts: { language: Language; solution: string; datasets: DatasetRef[] }): Promise<TableDisplay | null> {
    await this.ensureReady();
    const r = await this.call<{ ok: boolean; item?: TableDisplay; error?: string }>({
      type: 'expected',
      language: opts.language,
      solution: opts.solution,
      datasets: opts.datasets,
      tables: opts.datasets.map((d) => d.name),
    });
    if (!r.ok) throw new Error(r.error || 'Target tidak tersedia');
    return r.item ?? null;
  }

  async describeTables(datasets: DatasetRef[]): Promise<Record<string, TableSchema>> {
    await this.ensureReady();
    const r = await this.call<{ ok: boolean; tables?: Record<string, TableSchema>; error?: string }>({
      type: 'describe',
      datasets,
      tables: datasets.map((d) => d.name),
    });
    if (!r.ok) throw new Error(r.error || 'Gagal membaca skema');
    return r.tables || {};
  }

  async getVariable(name: string): Promise<DisplayItem> {
    const r = await this.call<{ ok: boolean; item?: DisplayItem; error?: string }>({ type: 'variable', name });
    if (!r.ok || !r.item) throw new Error(r.error || 'Variabel tidak ditemukan');
    return r.item;
  }

  async loadPackages(packages: string[], onProgress?: (m: string, pct?: number) => void) {
    await this.ensureReady();
    const r = await this.call<{ loaded: string[] }>({ type: 'loadPackages', packages }, { onProgress });
    this.set({ loadedPackages: r.loaded });
    return r.loaded;
  }

  async smokeTest(datasets: DatasetRef[]) {
    await this.ensureReady();
    return this.call<{ checks: { name: string; ok: boolean; detail: string; ms: number }[] }>({ type: 'smoke', datasets });
  }

  isRunning() {
    return this.runningId !== null;
  }
}

export const pythonRuntime = new PythonRuntime();

export function useRuntimeState(): RuntimeState {
  return useSyncExternalStore(pythonRuntime.subscribe, pythonRuntime.getState, pythonRuntime.getState);
}
