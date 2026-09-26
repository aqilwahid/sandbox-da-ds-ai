import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isExerciseFile, parseDatasetRegistry, parseExerciseMarkdown } from '../../src/content/parser';
import type { DatasetInfo, Exercise } from '../../src/content/types';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT_DIR = path.join(ROOT, 'content');
export const DATASET_DIR = path.join(ROOT, 'public', 'datasets');

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

export interface LoadedContent {
  exercises: Exercise[];
  datasets: Record<string, DatasetInfo>;
  parseErrors: { file: string; message: string }[];
}

export function loadContent(): LoadedContent {
  const parseErrors: { file: string; message: string }[] = [];
  const exercises: Exercise[] = [];
  for (const file of walk(CONTENT_DIR).sort()) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (!isExerciseFile(rel)) continue;
    try {
      exercises.push(parseExerciseMarkdown(fs.readFileSync(file, 'utf-8'), '/' + rel));
    } catch (e) {
      parseErrors.push({ file: rel, message: (e as Error).message });
    }
  }
  const regPath = path.join(CONTENT_DIR, 'datasets.yaml');
  const datasets = fs.existsSync(regPath) ? parseDatasetRegistry(fs.readFileSync(regPath, 'utf-8')) : {};
  exercises.sort((a, b) => (a.track === b.track ? a.order - b.order : a.track.localeCompare(b.track)));
  return { exercises, datasets, parseErrors };
}
