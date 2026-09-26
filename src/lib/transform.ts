/**
 * Mesin transformasi tabel mini untuk visual "transformasi".
 * Setiap langkah menghasilkan tampilan SEBELUM (dengan penanda baris yang dibuang,
 * kelompok berwarna, dsb.) dan SESUDAH.
 */
import { evaluate, type Value } from './expr';

export type Cell = Value;
export interface MiniTableData {
  columns: string[];
  rows: Cell[][];
}
export type RowState = 'normal' | 'removed' | 'new';

export interface TableView extends MiniTableData {
  rowStates?: RowState[];
  rowGroups?: (number | null)[];
  highlightCols?: string[];
  dimCols?: string[];
  changedCells?: string[]; // "r:c"
  groupLabels?: string[];
}

export interface StepSpec {
  operasi: string;
  kode?: string;
  penjelasan?: string;
  [k: string]: unknown;
}

export interface StepView {
  step: StepSpec;
  before: TableView;
  after: TableView;
  note: string;
}

type Row = Record<string, Cell>;

const toObj = (cols: string[], r: Cell[]): Row => Object.fromEntries(cols.map((c, i) => [c, r[i] ?? null]));
const arr = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function normalizeCell(v: unknown): Cell {
  if (v === undefined || v === null || v === '~') return null;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export function normalizeTable(t: { kolom?: unknown; baris?: unknown; columns?: unknown; rows?: unknown }): MiniTableData {
  const columns = arr((t.kolom ?? t.columns) as string[]).map(String);
  const rows = arr((t.baris ?? t.rows) as unknown[][]).map((r) => columns.map((_, i) => normalizeCell(arr(r)[i])));
  return { columns, rows };
}

function compare(a: Cell, b: Cell): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'id');
}

interface Cond {
  kolom: string;
  op?: string;
  nilai?: unknown;
}

function matchCond(row: Row, c: Cond): boolean {
  const v = row[c.kolom] ?? null;
  const op = (c.op || '=').toLowerCase();
  const target = c.nilai as Cell;
  switch (op) {
    case '=':
    case '==':
      return v !== null && compare(v, normalizeCell(target)) === 0;
    case '!=':
    case '<>':
      return v !== null && compare(v, normalizeCell(target)) !== 0;
    case '>':
      return v !== null && compare(v, normalizeCell(target)) > 0;
    case '>=':
      return v !== null && compare(v, normalizeCell(target)) >= 0;
    case '<':
      return v !== null && compare(v, normalizeCell(target)) < 0;
    case '<=':
      return v !== null && compare(v, normalizeCell(target)) <= 0;
    case 'in':
      return arr(c.nilai as Cell[]).some((t) => v !== null && compare(v, normalizeCell(t)) === 0);
    case 'like': {
      const pattern = String(target ?? '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/%/g, '.*')
        .replace(/_/g, '.');
      return v !== null && new RegExp(`^${pattern}$`, 'i').test(String(v));
    }
    case 'kosong':
    case 'is null':
      return v === null;
    case 'tidak_kosong':
    case 'is not null':
      return v !== null;
    default:
      return false;
  }
}

function evalFilter(step: StepSpec, row: Row): boolean {
  const k = step.kondisi;
  if (typeof k === 'string') return Boolean(evaluate(k, row));
  const conds = arr(k as Cond[]);
  const mode = String(step.gabung || 'and').toLowerCase();
  return mode === 'or' ? conds.some((c) => matchCond(row, c)) : conds.every((c) => matchCond(row, c));
}

interface AggSpec {
  fungsi: string;
  kolom?: string;
  nama?: string;
}

function aggName(a: AggSpec) {
  return a.nama || (a.kolom ? `${a.fungsi}_${a.kolom}` : a.fungsi);
}

function aggregate(rows: Row[], a: AggSpec): Cell {
  const fn = a.fungsi.toLowerCase();
  const vals = a.kolom ? rows.map((r) => r[a.kolom!]).filter((v) => v !== null && v !== undefined) : rows.map(() => 1);
  const nums = vals.map(Number).filter((n) => Number.isFinite(n));
  switch (fn) {
    case 'count':
      return vals.length;
    case 'nunique':
    case 'count_distinct':
      return new Set(vals.map(String)).size;
    case 'sum':
      return nums.reduce((s, n) => s + n, 0);
    case 'avg':
    case 'mean':
      return nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100 : null;
    case 'min':
      return vals.length ? vals.reduce((m, v) => (compare(v as Cell, m as Cell) < 0 ? v : m)) as Cell : null;
    case 'max':
      return vals.length ? vals.reduce((m, v) => (compare(v as Cell, m as Cell) > 0 ? v : m)) as Cell : null;
    case 'median': {
      const s = nums.slice().sort((x, y) => x - y);
      if (!s.length) return null;
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    }
    default:
      return null;
  }
}

function groupKeyOf(row: Row, by: string[]) {
  return JSON.stringify(by.map((b) => row[b] ?? null));
}

export function runTransform(input: MiniTableData, steps: StepSpec[]): StepView[] {
  const views: StepView[] = [];
  let cur: MiniTableData = { columns: [...input.columns], rows: input.rows.map((r) => [...r]) };

  for (const step of steps) {
    const op = String(step.operasi || '').toLowerCase().replace(/-/g, '_');
    const rows = cur.rows.map((r) => toObj(cur.columns, r));
    let before: TableView = { ...cur };
    let after: TableView = { ...cur };
    let note = '';

    try {
      switch (op) {
        case 'filter': {
          const keep = rows.map((r) => evalFilter(step, r));
          before = { ...cur, rowStates: keep.map((k) => (k ? 'normal' : 'removed')) };
          after = { columns: cur.columns, rows: cur.rows.filter((_, i) => keep[i]) };
          note = `${keep.filter(Boolean).length} dari ${keep.length} baris lolos syarat`;
          break;
        }
        case 'urut': {
          const cols = arr(step.kolom as string | string[]);
          const dirs = arr(step.arah as string | string[]).map((d) => String(d).toLowerCase());
          const idx = cur.rows.map((_, i) => i);
          idx.sort((a, b) => {
            for (let k = 0; k < cols.length; k++) {
              const c = compare(rows[a][cols[k]] ?? null, rows[b][cols[k]] ?? null);
              if (c !== 0) return (dirs[k] || dirs[0] || 'asc') === 'desc' ? -c : c;
            }
            return a - b;
          });
          before = { ...cur, highlightCols: cols };
          after = { columns: cur.columns, rows: idx.map((i) => cur.rows[i]), highlightCols: cols };
          note = `Diurutkan menurut ${cols.join(', ')}`;
          break;
        }
        case 'batasi': {
          const n = Number(step.n) || 0;
          before = { ...cur, rowStates: cur.rows.map((_, i) => (i < n ? 'normal' : 'removed')) };
          after = { columns: cur.columns, rows: cur.rows.slice(0, n) };
          note = `Ambil ${n} baris teratas`;
          break;
        }
        case 'pilih': {
          const cols = arr(step.kolom as string[]);
          before = { ...cur, highlightCols: cols, dimCols: cur.columns.filter((c) => !cols.includes(c)) };
          after = { columns: cols, rows: rows.map((r) => cols.map((c) => r[c] ?? null)) };
          note = `${cols.length} dari ${cur.columns.length} kolom dipilih`;
          break;
        }
        case 'kolom_baru': {
          const name = String(step.nama || 'kolom_baru');
          const kasus = arr(step.kasus as { jika?: string; maka?: unknown; lainnya?: unknown }[]);
          const values = rows.map((r) => {
            if (kasus.length) {
              for (const k of kasus) {
                if (k.jika !== undefined) {
                  if (evaluate(String(k.jika), r)) return normalizeCell(k.maka);
                } else if (k.lainnya !== undefined) return normalizeCell(k.lainnya);
              }
              return null;
            }
            return evaluate(String(step.rumus ?? 'null'), r);
          });
          const existing = cur.columns.indexOf(name);
          const columns = existing >= 0 ? cur.columns : [...cur.columns, name];
          const newRows = cur.rows.map((r, i) => {
            const copy = [...r];
            if (existing >= 0) copy[existing] = values[i];
            else copy.push(values[i]);
            return copy;
          });
          before = { ...cur };
          after = { columns, rows: newRows, highlightCols: [name] };
          note = `Kolom baru \`${name}\` dihitung untuk setiap baris`;
          break;
        }
        case 'kelompok':
        case 'agregat': {
          const by = op === 'agregat' ? [] : arr(step.oleh as string | string[]);
          const aggs = arr(step.agregasi as AggSpec[]);
          const order: string[] = [];
          const groups = new Map<string, Row[]>();
          rows.forEach((r) => {
            const k = groupKeyOf(r, by);
            if (!groups.has(k)) {
              groups.set(k, []);
              order.push(k);
            }
            groups.get(k)!.push(r);
          });
          const groupIndex = rows.map((r) => order.indexOf(groupKeyOf(r, by)));
          before = { ...cur, rowGroups: groupIndex, highlightCols: by };
          const columns = [...by, ...aggs.map(aggName)];
          const outRows = order.map((k) => {
            const members = groups.get(k)!;
            return [...by.map((b) => members[0][b] ?? null), ...aggs.map((a) => aggregate(members, a))];
          });
          after = {
            columns,
            rows: outRows,
            rowGroups: op === 'agregat' ? [null] : order.map((_, i) => i),
            highlightCols: aggs.map(aggName),
          };
          note = op === 'agregat' ? `${rows.length} baris diringkas menjadi 1 baris` : `${rows.length} baris → ${order.length} kelompok`;
          break;
        }
        case 'gabung': {
          const other = normalizeTable((step.dengan || {}) as Record<string, unknown>);
          const kl = String(step.kunci_kiri || step.kunci || '');
          const kr = String(step.kunci_kanan || step.kunci || '');
          const tipe = String(step.tipe || 'inner').toLowerCase();
          const rightRows = other.rows.map((r) => toObj(other.columns, r));
          const rightCols = other.columns.filter((c) => c !== kr && !cur.columns.includes(c));
          const outRows: Cell[][] = [];
          const states: RowState[] = [];
          rows.forEach((r, i) => {
            const matches = rightRows.filter((rr) => r[kl] !== null && compare(rr[kr] ?? null, r[kl] ?? null) === 0);
            if (matches.length) {
              states.push('normal');
              matches.forEach((m) => outRows.push([...cur.rows[i], ...rightCols.map((c) => m[c] ?? null)]));
            } else {
              states.push(tipe === 'left' ? 'normal' : 'removed');
              if (tipe === 'left') outRows.push([...cur.rows[i], ...rightCols.map(() => null)]);
            }
          });
          before = { ...cur, rowStates: states, highlightCols: [kl] };
          after = { columns: [...cur.columns, ...rightCols], rows: outRows, highlightCols: rightCols };
          note = `${tipe.toUpperCase()} JOIN pada ${kl}${kl !== kr ? ` = ${kr}` : ''}`;
          break;
        }
        case 'peringkat': {
          const part = step.partisi ? arr(step.partisi as string | string[]) : [];
          const by = String(step.urut || cur.columns[cur.columns.length - 1]);
          const desc = String(step.arah || 'desc').toLowerCase() === 'desc';
          const name = String(step.nama || 'peringkat');
          const fn = String(step.fungsi || 'rank').toLowerCase();
          const order: string[] = [];
          rows.forEach((r) => {
            const k = groupKeyOf(r, part);
            if (!order.includes(k)) order.push(k);
          });
          const ranked = rows.map((r, i) => ({ r, i, g: order.indexOf(groupKeyOf(r, part)) }));
          ranked.sort((a, b) => a.g - b.g || (desc ? -1 : 1) * compare(a.r[by] ?? null, b.r[by] ?? null) || a.i - b.i);
          const rankVals: number[] = [];
          ranked.forEach((item, idx) => {
            const prev = ranked[idx - 1];
            if (!prev || prev.g !== item.g) rankVals.push(1);
            else if (fn === 'rank' && compare(prev.r[by] ?? null, item.r[by] ?? null) === 0) rankVals.push(rankVals[idx - 1]);
            else {
              let pos = 1;
              for (let j = idx - 1; j >= 0 && ranked[j].g === item.g; j--) pos++;
              rankVals.push(pos);
            }
          });
          before = { ...cur, rowGroups: rows.map((r) => order.indexOf(groupKeyOf(r, part))), highlightCols: [...part, by] };
          after = {
            columns: [...cur.columns, name],
            rows: ranked.map((item, idx) => [...cur.rows[item.i], rankVals[idx]]),
            rowGroups: ranked.map((item) => item.g),
            highlightCols: [name],
          };
          note = part.length ? `Peringkat dihitung ulang di setiap ${part.join(', ')}` : 'Peringkat untuk seluruh baris';
          break;
        }
        case 'isi_kosong': {
          const cols = arr(step.kolom as string | string[]);
          const changed: string[] = [];
          const fill: Record<string, Cell> = {};
          cols.forEach((c) => {
            const metode = String(step.metode || '').toLowerCase();
            if (metode === 'mean' || metode === 'median') {
              fill[c] = aggregate(rows, { fungsi: metode, kolom: c });
            } else fill[c] = normalizeCell(step.nilai ?? 0);
          });
          const newRows = cur.rows.map((r, ri) =>
            r.map((v, ci) => {
              const col = cur.columns[ci];
              if (cols.includes(col) && v === null) {
                changed.push(`${ri}:${ci}`);
                return fill[col];
              }
              return v;
            }),
          );
          before = { ...cur, changedCells: changed, highlightCols: cols };
          after = { columns: cur.columns, rows: newRows, changedCells: changed, highlightCols: cols };
          note = `${changed.length} sel kosong diisi`;
          break;
        }
        case 'hapus_kosong': {
          const cols = step.kolom ? arr(step.kolom as string | string[]) : cur.columns;
          const keep = rows.map((r) => cols.every((c) => r[c] !== null && r[c] !== undefined));
          before = { ...cur, rowStates: keep.map((k) => (k ? 'normal' : 'removed')), highlightCols: step.kolom ? cols : [] };
          after = { columns: cur.columns, rows: cur.rows.filter((_, i) => keep[i]) };
          note = `${keep.filter((k) => !k).length} baris dengan nilai kosong dibuang`;
          break;
        }
        case 'hapus_duplikat': {
          const cols = step.kolom ? arr(step.kolom as string | string[]) : cur.columns;
          const seen = new Set<string>();
          const keep = rows.map((r) => {
            const k = JSON.stringify(cols.map((c) => r[c] ?? null));
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          before = { ...cur, rowStates: keep.map((k) => (k ? 'normal' : 'removed')) };
          after = { columns: cur.columns, rows: cur.rows.filter((_, i) => keep[i]) };
          note = `${keep.filter((k) => !k).length} baris duplikat dibuang`;
          break;
        }
        default:
          note = `Operasi "${step.operasi}" belum didukung`;
      }
    } catch (e) {
      note = `Tidak bisa menghitung langkah ini: ${(e as Error).message}`;
    }
    views.push({ step, before, after, note });
    cur = { columns: after.columns, rows: after.rows };
  }
  return views;
}

/** Format angka mini-table: pemisah ribuan hanya untuk angka besar (tahun 2025 tetap "2025"). */
export function formatMiniCell(v: Cell, nullLabel = 'NULL'): string {
  if (v === null || v === undefined) return nullLabel;
  if (typeof v === 'number') {
    if (!Number.isInteger(v)) return v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
    return Math.abs(v) >= 10000 ? v.toLocaleString('id-ID') : String(v);
  }
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  return String(v);
}
