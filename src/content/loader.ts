import { absoluteUrl } from '../config';
import type { DatasetRef } from '../runtime/types';
import datasetsYaml from '../../content/datasets.yaml?raw';
import { isExerciseFile, parseDatasetRegistry, parseExerciseMarkdown } from './parser';
import type { DatasetInfo, Exercise, TrackId } from './types';
import { TRACK_IDS } from './types';
import { validateExercises } from './validator';

// Semua file latihan dibundel saat build (tidak perlu server)
const rawModules = import.meta.glob('/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface ContentBundle {
  exercises: Exercise[];
  byId: Map<string, Exercise>;
  datasets: Record<string, DatasetInfo>;
  errors: string[];
  warnings: string[];
}

let bundle: ContentBundle | null = null;

export function getContent(): ContentBundle {
  if (bundle) return bundle;
  const errors: string[] = [];
  const exercises: Exercise[] = [];
  for (const [path, raw] of Object.entries(rawModules)) {
    if (!isExerciseFile(path)) continue;
    try {
      exercises.push(parseExerciseMarkdown(raw, path));
    } catch (e) {
      errors.push(`${path}: ${(e as Error).message}`);
    }
  }
  let datasets: Record<string, DatasetInfo> = {};
  try {
    datasets = parseDatasetRegistry(datasetsYaml);
  } catch (e) {
    errors.push(`content/datasets.yaml: ${(e as Error).message}`);
  }
  const validation = validateExercises(exercises, datasets);
  const warnings: string[] = [];
  for (const issue of validation.issues) {
    const msg = `${issue.file ?? ''} ${issue.message}`.trim();
    if (issue.type === 'error') errors.push(msg);
    else warnings.push(msg);
  }
  if (errors.length) console.error('Masalah konten latihan:\n' + errors.join('\n'));
  const rank = (t: TrackId) => TRACK_IDS.indexOf(t);
  exercises.sort((a, b) => (a.track === b.track ? a.order - b.order : rank(a.track) - rank(b.track)));
  bundle = { exercises, byId: new Map(exercises.map((e) => [e.id, e])), datasets, errors, warnings };
  return bundle;
}

export function exercisesByTrack(track: TrackId): Exercise[] {
  return getContent().exercises.filter((e) => e.track === track);
}

export function getExercise(id: string): Exercise | undefined {
  return getContent().byId.get(id);
}

export function neighbours(ex: Exercise): { prev?: Exercise; next?: Exercise } {
  const list = exercisesByTrack(ex.track);
  const i = list.findIndex((e) => e.id === ex.id);
  return { prev: i > 0 ? list[i - 1] : undefined, next: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined };
}

export function datasetRefs(ex: Exercise): DatasetRef[] {
  const reg = getContent().datasets;
  return ex.frontmatter.datasets.map((name) => {
    const info = reg[name];
    const file = info?.file || `${name}.csv`;
    return { name, file, url: absoluteUrl(`datasets/${file}`) };
  });
}

export function allDatasetRefs(): DatasetRef[] {
  return Object.values(getContent().datasets).map((d) => ({ name: d.name, file: d.file, url: absoluteUrl(`datasets/${d.file}`) }));
}

const MODULE_TO_PACKAGE: Record<string, string> = {
  pandas: 'pandas',
  numpy: 'numpy',
  matplotlib: 'matplotlib',
  sklearn: 'scikit-learn',
  scipy: 'scipy',
  statsmodels: 'statsmodels',
  duckdb: 'duckdb',
};

export function detectPackages(code: string): string[] {
  const out = new Set<string>();
  for (const m of code.matchAll(/^\s*(?:from|import)\s+([A-Za-z_][\w]*)/gm)) {
    const pkg = MODULE_TO_PACKAGE[m[1]];
    if (pkg) out.add(pkg);
  }
  return [...out];
}

export function packagesFor(ex: Exercise): string[] {
  const set = new Set<string>(ex.frontmatter.packages);
  if (ex.language === 'sql') set.add('duckdb');
  for (const code of [ex.sections.starter, ex.sections.solusi, ex.sections.checker]) {
    detectPackages(code).forEach((p) => set.add(p));
  }
  return [...set];
}

/** Semua paket yang dipakai seluruh latihan (untuk Cek Kesiapan/offline). */
export function allPackages(): string[] {
  const set = new Set<string>();
  getContent().exercises.forEach((ex) => packagesFor(ex).forEach((p) => set.add(p)));
  return [...set].sort();
}
