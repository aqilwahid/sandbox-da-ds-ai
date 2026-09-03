import type { CheckResult, RunResult, RuntimeProgressCallback, StreamOutputCallback } from './types';

export interface WorkerManagerOptions {
  workerFactory: () => Worker;
  defaultTimeoutMs?: number;
}

export class WorkerManager {
  private worker: Worker | null = null;
  private workerFactory: () => Worker;
  private defaultTimeoutMs: number;
  private isInitialized = false;
  private onProgressCallback: RuntimeProgressCallback | null = null;
  private activeStreamCallback: StreamOutputCallback | null = null;
  private accumulatedStreamStdout = '';
  private accumulatedStreamStderr = '';
  private pendingRequests = new Map<
    string,
    {
      resolve: (val: any) => void;
      reject: (err: any) => void;
      timer?: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(options: WorkerManagerOptions) {
    this.workerFactory = options.workerFactory;
    this.defaultTimeoutMs = options.defaultTimeoutMs || 6000;
  }

  private createWorker(): Worker {
    const worker = this.workerFactory();
    worker.onmessage = (e) => this.handleMessage(e.data);
    worker.onerror = (e) => this.handleWorkerError(e);
    return worker;
  }

  private handleMessage(data: any) {
    const { id, type, pct, msg, stream, text } = data;

    // Real-time progress updates
    if (type === 'PROGRESS' && this.onProgressCallback && typeof pct === 'number') {
      this.onProgressCallback(pct, msg || '');
      return;
    }

    // Real-time stdout/stderr streaming
    if (type === 'STREAM' && typeof text === 'string') {
      if (stream === 'stderr') {
        this.accumulatedStreamStderr += text;
      } else {
        this.accumulatedStreamStdout += text;
      }
      if (this.activeStreamCallback) {
        this.activeStreamCallback(stream || 'stdout', text);
      }
      return;
    }

    if (!id || !this.pendingRequests.has(id)) return;

    const { resolve, reject, timer } = this.pendingRequests.get(id)!;
    if (timer) clearTimeout(timer);
    this.pendingRequests.delete(id);

    if (type === 'ERROR') {
      reject(new Error(data.error || 'Worker execution failed'));
      return;
    }

    resolve(data);
  }

  private handleWorkerError(e: ErrorEvent) {
    console.error('Web Worker encountered an unhandled error:', e);
    this.pendingRequests.forEach(({ reject, timer }) => {
      if (timer) clearTimeout(timer);
      reject(new Error(e.message || 'Worker crash'));
    });
    this.pendingRequests.clear();
  }

  public async init(opts: { onProgress: RuntimeProgressCallback }): Promise<void> {
    this.onProgressCallback = opts.onProgress;
    if (this.worker) {
      this.terminate();
    }

    this.worker = this.createWorker();
    const reqId = `init_${Date.now()}_${Math.random()}`;

    await new Promise<void>((resolve, reject) => {
      this.pendingRequests.set(reqId, {
        resolve: () => {
          this.isInitialized = true;
          resolve();
        },
        reject,
      });

      this.worker!.postMessage({ id: reqId, type: 'INIT' });
    });
  }

  public async preload(packages: string[]): Promise<void> {
    if (!this.worker || !this.isInitialized) {
      throw new Error('Worker belum diinisialisasi.');
    }

    const reqId = `preload_${Date.now()}_${Math.random()}`;
    await new Promise<void>((resolve, reject) => {
      this.pendingRequests.set(reqId, {
        resolve: () => resolve(),
        reject,
      });

      this.worker!.postMessage({ id: reqId, type: 'PRELOAD', packages });
    });
  }

  public async run(code: string, timeoutMs?: number, onStream?: StreamOutputCallback): Promise<RunResult> {
    const timeout = timeoutMs || this.defaultTimeoutMs;
    const reqId = `run_${Date.now()}_${Math.random()}`;

    if (!this.worker || !this.isInitialized) {
      await this.init({ onProgress: () => {} });
    }

    this.activeStreamCallback = onStream || null;
    this.accumulatedStreamStdout = '';
    this.accumulatedStreamStderr = '';

    return new Promise<RunResult>((resolve) => {
      const timer = setTimeout(async () => {
        console.warn(`Execution timed out after ${timeout}ms. Terminating worker...`);
        this.pendingRequests.delete(reqId);
        this.activeStreamCallback = null;

        // Terminate hanging worker immediately
        this.terminate();

        const restartStartTime = performance.now();
        // Auto restart worker in background (<3 seconds)
        try {
          await this.init({ onProgress: () => {} });
        } catch (restartErr) {
          console.error('Failed to auto-restart worker:', restartErr);
        }
        const restartDuration = Math.round(performance.now() - restartStartTime);

        resolve({
          stdout: this.accumulatedStreamStdout,
          stderr: `${this.accumulatedStreamStderr}\n[TIMEOUT ERROR]: Kode eksekusi berjalan melebihi batas waktu ${timeout / 1000} detik.\nWorker telah dimatikan secara paksa (terminated) dan runtime di-reset (restart: ${restartDuration}ms).\nPeriksa apakah kode mengandung infinite loop (perulangan tanpa henti) atau komputasi terlalu berat.`,
          error: `Execution timed out (${timeout / 1000}s limit exceeded)`,
          durationMs: timeout,
          artifacts: [],
        });
      }, timeout);

      this.pendingRequests.set(reqId, {
        resolve: (data) => {
          this.activeStreamCallback = null;
          resolve({
            stdout: data.stdout !== undefined ? data.stdout : this.accumulatedStreamStdout,
            stderr: data.stderr !== undefined ? data.stderr : this.accumulatedStreamStderr,
            error: data.error,
            artifacts: data.artifacts || [],
            durationMs: data.durationMs || 0,
          });
        },
        reject: (err) => {
          this.activeStreamCallback = null;
          resolve({
            stdout: this.accumulatedStreamStdout,
            stderr: `${this.accumulatedStreamStderr}\n${String(err.message || err)}`,
            error: String(err.message || err),
            durationMs: 0,
          });
        },
        timer,
      });

      this.worker!.postMessage({ id: reqId, type: 'RUN', code });
    });
  }

  public async runChecker(checkerCode: string, userCode?: string): Promise<CheckResult> {
    if (!this.worker || !this.isInitialized) {
      await this.init({ onProgress: () => {} });
    }

    const reqId = `check_${Date.now()}_${Math.random()}`;

    return new Promise<CheckResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        resolve({
          passed: false,
          message: 'Checker timed out',
          details: 'Kode pengujian (checker) melebihi batas waktu eksekusi.',
        });
      }, 5000);

      this.pendingRequests.set(reqId, {
        resolve: (data) => {
          resolve({
            passed: Boolean(data.passed),
            message: data.message || (data.passed ? 'Lulus pengujian!' : 'Belum memenuhi kriteria.'),
            details: data.details,
          });
        },
        reject: (err) => {
          resolve({
            passed: false,
            message: 'Error saat menjalankan checker',
            details: String(err.message || err),
          });
        },
        timer,
      });

      this.worker!.postMessage({ id: reqId, type: 'RUN_CHECKER', checkerCode, code: userCode });
    });
  }

  public async reset(): Promise<void> {
    if (!this.worker) return;
    const reqId = `reset_${Date.now()}`;

    await new Promise<void>((resolve) => {
      this.pendingRequests.set(reqId, {
        resolve: () => resolve(),
        reject: () => resolve(),
      });
      this.worker!.postMessage({ id: reqId, type: 'RESET' });
    });
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.activeStreamCallback = null;
    }
  }

  public ready(): boolean {
    return this.isInitialized && this.worker !== null;
  }
}
