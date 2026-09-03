import type { CheckResult, RunResult, RuntimeAdapter, RuntimeProgressCallback, StreamOutputCallback } from '../types';
import { WorkerManager } from '../workerManager';

export class PyodideAdapter implements RuntimeAdapter {
  public id = 'pyodide';
  public name = 'Pyodide Python Data Science Sandbox';
  public language: 'python' = 'python';
  private manager: WorkerManager;

  constructor() {
    this.manager = new WorkerManager({
      workerFactory: () =>
        new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url), {
          type: 'module',
        }),
      defaultTimeoutMs: 7000,
    });
  }

  public async init(opts: { onProgress: RuntimeProgressCallback }): Promise<void> {
    await this.manager.init(opts);
  }

  public async preload(packages: string[]): Promise<void> {
    await this.manager.preload(packages);
  }

  public async run(code: string, timeoutMs = 7000, onStream?: StreamOutputCallback): Promise<RunResult> {
    return this.manager.run(code, timeoutMs, onStream);
  }

  public async runChecker(checkerCode: string, userCode?: string): Promise<CheckResult> {
    return this.manager.runChecker(checkerCode, userCode);
  }

  public async reset(): Promise<void> {
    await this.manager.reset();
  }

  public terminate(): void {
    this.manager.terminate();
  }

  public isReady(): boolean {
    return this.manager.ready();
  }
}
