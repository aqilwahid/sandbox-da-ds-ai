export type ColumnKind = 'number' | 'text' | 'date' | 'bool';

export interface ParsedCsv {
  columns: string[];
  kinds: ColumnKind[];
  rows: (string | number | boolean | null)[][];
}

/** Parser CSV kecil (RFC 4180: kutip ganda, koma/baris baru di dalam kutip). */
export function parseCsv(text: string): ParsedCsv {
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') records.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    records.push(row);
  }
  const [header = [], ...body] = records;
  const kinds: ColumnKind[] = header.map((_, ci) => inferKind(body.map((r) => r[ci] ?? '')));
  const rows = body.map((r) =>
    header.map((_, ci) => {
      const raw = r[ci] ?? '';
      if (raw === '') return null;
      if (kinds[ci] === 'number') return Number(raw);
      if (kinds[ci] === 'bool') return raw.toLowerCase() === 'true';
      return raw;
    }),
  );
  return { columns: header, kinds, rows };
}

const NUM_RE = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function inferKind(values: string[]): ColumnKind {
  const filled = values.filter((v) => v !== '');
  if (!filled.length) return 'text';
  if (filled.every((v) => NUM_RE.test(v))) return 'number';
  if (filled.every((v) => DATE_RE.test(v))) return 'date';
  if (filled.every((v) => /^(true|false)$/i.test(v))) return 'bool';
  return 'text';
}

export interface ColumnProfile {
  name: string;
  kind: ColumnKind;
  missing: number;
  unique: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  histogram?: number[];
  top?: { value: string; count: number }[];
}

export function profileColumns(csv: ParsedCsv): ColumnProfile[] {
  return csv.columns.map((name, ci) => {
    const vals = csv.rows.map((r) => r[ci]);
    const filled = vals.filter((v) => v !== null && v !== undefined);
    const kind = csv.kinds[ci];
    const unique = new Set(filled.map(String)).size;
    const p: ColumnProfile = { name, kind, missing: vals.length - filled.length, unique };
    if (kind === 'number') {
      const nums = (filled as number[]).slice().sort((a, b) => a - b);
      if (nums.length) {
        p.min = nums[0];
        p.max = nums[nums.length - 1];
        p.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const mid = Math.floor(nums.length / 2);
        p.median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
        const bins = 12;
        const span = (p.max as number) - (p.min as number) || 1;
        const h = new Array(bins).fill(0);
        for (const n of nums) {
          const b = Math.min(bins - 1, Math.floor(((n - (p.min as number)) / span) * bins));
          h[b]++;
        }
        p.histogram = h;
      }
    } else {
      const counts = new Map<string, number>();
      for (const v of filled) counts.set(String(v), (counts.get(String(v)) || 0) + 1);
      p.top = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([value, count]) => ({ value, count }));
      if (kind === 'date' && filled.length) {
        const sorted = (filled as string[]).slice().sort();
        p.min = sorted[0];
        p.max = sorted[sorted.length - 1];
      }
    }
    return p;
  });
}
