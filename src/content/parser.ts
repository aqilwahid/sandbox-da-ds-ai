import yaml from 'js-yaml';
import type {
  DatasetInfo,
  Exercise,
  ExerciseFrontmatter,
  ExerciseSections,
  Language,
  Level,
  TrackId,
} from './types';
import { LEVELS, TRACK_IDS } from './types';

/**
 * Parser file latihan Markdown.
 *
 * Format:
 *   ---
 *   (frontmatter YAML)
 *   ---
 *   ## instruksi      (markdown, boleh berisi blok ```visual)
 *   ## starter        (kode awal)
 *   ## solusi         (kode solusi referensi)
 *   ## checker        (kode Python penilai; opsional untuk SQL)
 *   ## hint-1 .. n    (petunjuk bertahap)
 *   ## pembahasan     (opsional)
 *
 * Dipakai oleh aplikasi (Vite) dan oleh script Node (tsx), jadi tidak boleh
 * memakai API khusus browser.
 */

const SECTION_RE = /^##[ \t]+([a-zA-Z0-9_-]+)[ \t]*$/gm;

/** File latihan harus diawali nomor urut, mis. `03-group-by.md`. File lain (README, _draft) diabaikan. */
export function isExerciseFile(filePath: string): boolean {
  const name = filePath.replace(/\\/g, '/').split('/').pop() || '';
  return /^\d+-[^/]+\.md$/i.test(name);
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function normalizeDatasetName(name: string): string {
  return name.replace(/\.(csv|parquet|json)$/i, '').trim();
}

function normalizeLanguage(parsed: Record<string, unknown>): Language {
  const lang = String(parsed.language ?? '').toLowerCase().trim();
  if (lang === 'sql' || lang === 'python') return lang;
  const runtime = String(parsed.runtime ?? '').toLowerCase().trim();
  if (['duckdb', 'sql', 'sqlite'].includes(runtime)) return 'sql';
  return 'python';
}

export function cleanCodeBlock(content: string): string {
  const trimmed = content.trim();
  const fence = trimmed.match(/^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\1\s*$/);
  if (fence) return fence[2];
  return trimmed;
}

export function parseExerciseMarkdown(rawContent: string, filePath: string): Exercise {
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/^﻿/, '');
  const fm = normalized.match(/^---\n([\s\S]*?)\n---[ \t]*\n([\s\S]*)$/);
  if (!fm) {
    throw new Error(`File ${filePath} tidak memiliki frontmatter YAML (--- ... ---) di baris pertama.`);
  }
  const [, rawYaml, rawBody] = fm;

  let parsed: Record<string, unknown>;
  try {
    const loaded = yaml.load(rawYaml);
    if (!loaded || typeof loaded !== 'object') throw new Error('frontmatter kosong');
    parsed = loaded as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Frontmatter YAML tidak valid di ${filePath}: ${(err as Error).message}`);
  }

  const language = normalizeLanguage(parsed);
  const level = String(parsed.level ?? 'pemula').toLowerCase() as Level;
  const frontmatter: ExerciseFrontmatter = {
    id: String(parsed.id ?? '').trim(),
    track: String(parsed.track ?? '').trim() as TrackId,
    title: String(parsed.title ?? '').trim(),
    level: LEVELS.includes(level) ? level : 'pemula',
    estimatedMinutes: Number(parsed.estimatedMinutes) || 10,
    language,
    datasets: toStringArray(parsed.datasets).map(normalizeDatasetName),
    packages: toStringArray(parsed.packages),
    prerequisites: toStringArray(parsed.prerequisites),
    concepts: toStringArray(parsed.concepts ?? parsed.tags),
    timeoutSec: Number(parsed.timeoutSec) || (language === 'sql' ? 20 : 40),
  };

  const sections: ExerciseSections = {
    instruksi: '',
    starter: '',
    solusi: '',
    checker: '',
    hints: [],
    pembahasan: '',
  };

  const matches: { name: string; index: number; start: number }[] = [];
  SECTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SECTION_RE.exec(rawBody)) !== null) {
    matches.push({ name: m[1].toLowerCase(), index: m.index, start: m.index + m[0].length });
  }

  const hintMap = new Map<number, string>();
  const seen = new Set<string>();
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const end = i + 1 < matches.length ? matches[i + 1].index : rawBody.length;
    const content = rawBody.slice(cur.start, end).trim();
    seen.add(cur.name);
    switch (cur.name) {
      case 'instruksi':
        sections.instruksi = content;
        break;
      case 'starter':
        sections.starter = cleanCodeBlock(content);
        break;
      case 'solusi':
        sections.solusi = cleanCodeBlock(content);
        break;
      case 'checker':
        sections.checker = cleanCodeBlock(content);
        break;
      case 'pembahasan':
        sections.pembahasan = content;
        break;
      default:
        if (cur.name.startsWith('hint-')) {
          const n = parseInt(cur.name.slice(5), 10);
          if (!Number.isNaN(n)) hintMap.set(n, content);
        }
    }
  }
  sections.hints = [...hintMap.keys()].sort((a, b) => a - b).map((k) => hintMap.get(k)!);

  const fileName = filePath.replace(/\\/g, '/').split('/').pop() || '';
  const fileMatch = fileName.match(/^(\d+)-(.*)\.md$/i);
  const order = fileMatch ? parseInt(fileMatch[1], 10) : 99;
  const slug = fileMatch ? fileMatch[2] : fileName.replace(/\.md$/i, '');

  const exercise: Exercise = {
    id: frontmatter.id,
    frontmatter,
    sections,
    filePath,
    track: frontmatter.track,
    language,
    order,
    slug,
  };
  // Tandai section yang tidak ada sama sekali (beda dengan kosong) untuk validator
  (exercise as Exercise & { _seen?: Set<string> })._seen = seen;
  return exercise;
}

export function parseDatasetRegistry(rawYaml: string): Record<string, DatasetInfo> {
  const loaded = (yaml.load(rawYaml) || {}) as Record<string, Record<string, unknown>>;
  const out: Record<string, DatasetInfo> = {};
  for (const [name, v] of Object.entries(loaded)) {
    const cols = (v.kolom || v.columns || {}) as Record<string, string>;
    out[name] = {
      name,
      file: String(v.file ?? `${name}.csv`),
      title: String(v.judul ?? v.title ?? name),
      description: String(v.deskripsi ?? v.description ?? ''),
      source: v.sumber ? String(v.sumber) : v.source ? String(v.source) : undefined,
      columns: Object.entries(cols).map(([col, desc]) => ({ name: col, description: String(desc ?? '') })),
    };
  }
  return out;
}

export { TRACK_IDS };
