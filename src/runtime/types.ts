import type { Language } from '../content/types';

export type CellValue = string | number | boolean | null;
export type ColumnKind = 'number' | 'text' | 'date' | 'bool';

export interface TableDisplay {
  type: 'table';
  title?: string | null;
  columns: string[];
  kinds: ColumnKind[];
  dtypes: string[];
  indexColumns: number;
  rows: CellValue[][];
  totalRows: number;
  truncated: boolean;
  source: 'sql' | 'dataframe' | 'ndarray' | 'python';
  statementLine?: number | null;
  auto?: boolean;
}

export interface TextDisplay {
  type: 'text';
  title?: string | null;
  text: string;
  auto?: boolean;
}

export interface JsonDisplay {
  type: 'json';
  title?: string | null;
  data: unknown;
  repr?: string;
  auto?: boolean;
}

export interface ImageDisplay {
  type: 'image';
  title?: string | null;
  data: string;
}

export type DisplayItem = TableDisplay | TextDisplay | JsonDisplay | ImageDisplay;

export interface RunErrorInfo {
  type: string;
  title: string;
  message: string;
  explanation: string;
  suggestion?: string | null;
  line?: number | null;
  column?: number | null;
  lineText?: string | null;
  trace?: string[];
  language: Language;
}

export interface VariableInfo {
  name: string;
  type: string;
  kind: string;
  summary: string;
  detail?: string;
  viewable: boolean;
}

export interface RunResult {
  ok: boolean;
  language: Language;
  error: RunErrorInfo | null;
  displays: DisplayItem[];
  figures: (ImageDisplay | TextDisplay)[];
  variables: VariableInfo[];
  durationMs: number;
  statements?: number;
  /** Diisi di sisi JS */
  stdout?: string;
  stderr?: string;
  stopped?: 'timeout' | 'user' | null;
}

export interface CheckTest {
  label: string;
  passed: boolean;
  detail?: string | null;
}

export interface CheckResult {
  passed: boolean;
  message: string;
  tests: CheckTest[];
  passedCount: number;
  totalCount: number;
  internalError?: string | null;
}

export interface DatasetRef {
  name: string;
  file: string;
  url: string;
}

export interface PrepareRequest {
  key: string;
  language: Language;
  packages: string[];
  datasets: DatasetRef[];
  warmup: string[];
}

export interface TableSchema {
  columns: { name: string; type: string }[];
  rows: number;
  error?: string;
}

export type RuntimeStatus = 'idle' | 'loading' | 'ready' | 'busy' | 'error';

export interface RuntimeState {
  status: RuntimeStatus;
  message: string;
  progress: number | null;
  packageSource: 'lokal' | 'cdn' | null;
  packageBase: string | null;
  loadedPackages: string[];
  error: string | null;
  canInterrupt: boolean;
  pythonVersion: string | null;
  restarts: number;
}
