import type { CheckResult, RunResult, RuntimeAdapter, RuntimeProgressCallback } from '../types';
import { WorkerManager } from '../workerManager';

export class MockRuntimeAdapter implements RuntimeAdapter {
  public id = 'mock';
  public name = 'Mock Sandbox Runtime';
  public language: 'python' | 'sql' | 'javascript' = 'python';
  private manager: WorkerManager;

  constructor(language: 'python' | 'sql' | 'javascript' = 'python') {
    this.language = language;
    this.manager = new WorkerManager({
      workerFactory: () =>
        new Worker(new URL('../workers/mock.worker.ts', import.meta.url), {
          type: 'module',
        }),
      defaultTimeoutMs: 5000,
    });
  }

  public async init(opts: { onProgress: RuntimeProgressCallback }): Promise<void> {
    await this.manager.init(opts);
  }

  public async preload(packages: string[]): Promise<void> {
    await this.manager.preload(packages);
  }

  public async run(code: string, timeoutMs = 5000): Promise<RunResult> {
    return this.manager.run(code, timeoutMs);
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
