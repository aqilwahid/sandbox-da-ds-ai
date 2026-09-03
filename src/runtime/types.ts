export type ArtifactType = 'table' | 'image' | 'json';

export interface TableArtifactData {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}

export interface RunArtifact {
  type: ArtifactType;
  title?: string;
  data: TableArtifactData | string | Record<string, unknown> | unknown[];
}

export interface RunResult {
  stdout: string;
  stderr: string;
  error?: string;
  artifacts?: RunArtifact[];
  durationMs: number;
}

export interface CheckResult {
  passed: boolean;
  message: string;
  details?: string;
}

export type RuntimeProgressCallback = (pct: number, msg: string) => void;
export type StreamOutputCallback = (stream: 'stdout' | 'stderr', text: string) => void;

export interface RuntimeAdapter {
  id: string;
  name: string;
  language: 'python' | 'sql' | 'javascript';
  init(opts: { onProgress: RuntimeProgressCallback }): Promise<void>;
  preload(packages: string[]): Promise<void>;
  run(code: string, timeoutMs?: number, onStream?: StreamOutputCallback): Promise<RunResult>;
  runChecker(checkerCode: string, userCode?: string): Promise<CheckResult>;
  reset(): Promise<void>;
  terminate(): void;
  isReady(): boolean;
}
