/**
 * Pemeriksaan blok ```visual saat build — menangkap YAML rusak, jenis visual salah ketik,
 * field wajib yang hilang, dan langkah "transformasi" yang gagal dihitung,
 * sebelum peserta melihatnya di kelas.
 */
import yaml from 'js-yaml';
import { normalizeTable, runTransform, type StepSpec } from '../lib/transform';
import type { Exercise } from './types';
import type { ValidationIssue } from './validator';

/** Harus sama dengan REGISTRY di src/components/visuals/VisualBlock.tsx. */
export const VISUAL_TYPES = [
  'anatomi',
  'tabel',
  'transformasi',
  'join',
  'alur',
  'struktur',
  'pilih-grafik',
  'regresi',
  'split-data',
  'confusion-matrix',
  'tokenisasi',
  'temperature',
  'embedding',
  'perbandingan',
] as const;

/** Field wajib per jenis (salah satu dari alternatif yang dipisah "|"). */
const REQUIRED: Record<string, string[]> = {
  anatomi: ['bagian'],
  tabel: ['kolom|columns', 'baris|rows'],
  transformasi: ['data', 'langkah'],
  join: ['kiri', 'kanan'],
  alur: ['langkah'],
  struktur: ['item|nilai'],
  regresi: ['titik'],
  tokenisasi: ['teks'],
  temperature: ['kandidat'],
  embedding: ['titik'],
  perbandingan: ['kiri', 'kanan'],
};

const VISUAL_RE = /^```visual[^\n]*\n([\s\S]*?)\n```[ \t]*$/gm;

function sectionsOf(ex: Exercise): [string, string][] {
  const s = ex.sections;
  return [
    ['instruksi', s.instruksi],
    ['pembahasan', s.pembahasan],
    ...s.hints.map((h, i) => [`hint-${i + 1}`, h] as [string, string]),
  ];
}

export function checkVisuals(exercises: Exercise[]): { issues: ValidationIssue[]; count: number } {
  const issues: ValidationIssue[] = [];
  let count = 0;
  for (const ex of exercises) {
    for (const [section, md] of sectionsOf(ex)) {
      if (!md) continue;
      let n = 0;
      for (const m of md.matchAll(VISUAL_RE)) {
        n++;
        count++;
        const where = `## ${section}, visual ke-${n}`;
        const err = (message: string) => issues.push({ type: 'error', file: ex.filePath, exerciseId: ex.id, message: `${where}: ${message}` });
        let spec: Record<string, unknown>;
        try {
          spec = yaml.load(m[1]) as Record<string, unknown>;
        } catch (e) {
          err(`YAML tidak valid — ${(e as Error).message.split('\n')[0]}`);
          continue;
        }
        if (!spec || typeof spec !== 'object') {
          err('isi blok visual kosong.');
          continue;
        }
        const jenis = String(spec.jenis || '').toLowerCase();
        if (!(VISUAL_TYPES as readonly string[]).includes(jenis)) {
          err(`jenis "${spec.jenis ?? ''}" tidak dikenal. Pilihan: ${VISUAL_TYPES.join(', ')}.`);
          continue;
        }
        for (const req of REQUIRED[jenis] || []) {
          const alts = req.split('|');
          if (!alts.some((k) => spec[k] !== undefined && spec[k] !== null)) err(`field "${alts.join('" atau "')}" wajib diisi untuk jenis ${jenis}.`);
        }
        if (jenis === 'transformasi' && spec.data && Array.isArray(spec.langkah)) {
          const views = runTransform(normalizeTable(spec.data as Record<string, unknown>), (spec.langkah as StepSpec[]).filter(Boolean));
          views.forEach((v, i) => {
            if (/^Tidak bisa menghitung|belum didukung/.test(v.note)) err(`langkah ${i + 1} (${v.step.operasi}) — ${v.note}`);
          });
        }
        if (jenis === 'join') {
          const kiri = normalizeTable((spec.kiri || {}) as Record<string, unknown>);
          const kanan = normalizeTable((spec.kanan || {}) as Record<string, unknown>);
          const kunci = String(spec.kunci || kiri.columns.find((c) => kanan.columns.includes(c)) || '');
          if (!kunci || !kiri.columns.includes(kunci) || !kanan.columns.includes(kunci)) {
            err(`kolom kunci "${kunci}" harus ada di tabel kiri dan kanan.`);
          }
        }
      }
    }
  }
  return { issues, count };
}
