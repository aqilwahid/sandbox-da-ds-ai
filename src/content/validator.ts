import type { DatasetInfo, Exercise } from './types';
import { LEVELS, TRACK_IDS } from './types';

export interface ValidationIssue {
  type: 'error' | 'warning';
  file?: string;
  exerciseId?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/** Validasi struktur konten. Dipakai saat build (script) dan saat aplikasi memuat konten. */
export function validateExercises(
  exercises: Exercise[],
  datasets?: Record<string, DatasetInfo>,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const idMap = new Map<string, Exercise>();
  const orderMap = new Map<string, Exercise>();

  const err = (ex: Exercise | undefined, message: string) =>
    issues.push({ type: 'error', file: ex?.filePath, exerciseId: ex?.id, message });
  const warn = (ex: Exercise | undefined, message: string) =>
    issues.push({ type: 'warning', file: ex?.filePath, exerciseId: ex?.id, message });

  for (const ex of exercises) {
    const fm = ex.frontmatter;
    if (!ex.id) {
      err(ex, 'Frontmatter "id" wajib diisi.');
      continue;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(ex.id)) {
      err(ex, `ID "${ex.id}" hanya boleh huruf kecil, angka, dan tanda minus.`);
    }
    const dup = idMap.get(ex.id);
    if (dup) err(ex, `ID duplikat "${ex.id}" (juga dipakai di ${dup.filePath}).`);
    else idMap.set(ex.id, ex);

    if (!TRACK_IDS.includes(fm.track)) {
      err(ex, `Track "${fm.track}" tidak valid. Pilihan: ${TRACK_IDS.join(', ')}.`);
    }
    const orderKey = `${fm.track}:${ex.order}`;
    const sameOrder = orderMap.get(orderKey);
    if (sameOrder) err(ex, `Nomor urut ${ex.order} dipakai dua kali di track ${fm.track} (${sameOrder.filePath}).`);
    else orderMap.set(orderKey, ex);

    if (!fm.title) err(ex, 'Frontmatter "title" wajib diisi.');
    if (!ex.sections.instruksi.trim()) err(ex, 'Section "## instruksi" hilang atau kosong.');
    const seen = (ex as Exercise & { _seen?: Set<string> })._seen;
    if (seen && !seen.has('starter')) err(ex, 'Section "## starter" hilang (boleh kosong, tapi judulnya harus ada).');
    if (!ex.sections.solusi.trim()) err(ex, 'Section "## solusi" hilang atau kosong.');
    if (ex.language === 'python' && !ex.sections.checker.trim()) {
      err(ex, 'Latihan Python wajib punya section "## checker".');
    }
    if (ex.sections.hints.length === 0) warn(ex, 'Belum ada hint (## hint-1, ## hint-2, ...).');
    if (ex.language === 'sql' && fm.datasets.length === 0) err(ex, 'Latihan SQL wajib menyebutkan datasets (nama tabel).');

    if (datasets) {
      for (const ds of fm.datasets) {
        if (!datasets[ds]) err(ex, `Dataset "${ds}" belum terdaftar di content/datasets.yaml.`);
      }
    }
  }

  for (const ex of exercises) {
    for (const p of ex.frontmatter.prerequisites) {
      if (!idMap.has(p)) err(ex, `Prasyarat "${p}" tidak ditemukan.`);
    }
  }

  // Level sebaiknya tidak turun di tengah track (judul level di daftar latihan akan muncul berulang)
  for (const track of TRACK_IDS) {
    const list = exercises.filter((e) => e.frontmatter.track === track).sort((a, b) => a.order - b.order);
    let maxIdx = -1;
    let maxLevel = '';
    for (const ex of list) {
      const idx = LEVELS.indexOf(ex.frontmatter.level);
      if (idx >= 0 && idx < maxIdx) warn(ex, `Level "${ex.frontmatter.level}" muncul setelah latihan level "${maxLevel}" — urutkan dari pemula ke lanjut.`);
      if (idx > maxIdx) {
        maxIdx = idx;
        maxLevel = ex.frontmatter.level;
      }
    }
  }

  // Deteksi siklus prasyarat (DFS)
  const state = new Map<string, 0 | 1 | 2>();
  const cycles: string[][] = [];
  const visit = (id: string, path: string[]) => {
    state.set(id, 1);
    const ex = idMap.get(id);
    for (const p of ex?.frontmatter.prerequisites || []) {
      if (!idMap.has(p)) continue;
      const st = state.get(p) || 0;
      if (st === 0) visit(p, [...path, p]);
      else if (st === 1) cycles.push([...path.slice(path.indexOf(p)), p]);
    }
    state.set(id, 2);
  };
  for (const id of idMap.keys()) if (!state.get(id)) visit(id, [id]);
  for (const c of cycles) {
    issues.push({ type: 'error', message: `Siklus prasyarat terdeteksi: ${c.join(' → ')}` });
  }

  return { valid: !issues.some((i) => i.type === 'error'), issues };
}
