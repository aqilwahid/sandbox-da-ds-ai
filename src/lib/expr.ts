/**
 * Evaluator ekspresi mini untuk visual "transformasi" (tanpa eval()).
 * Mendukung: angka, 'teks', nama kolom, + - * / %, perbandingan (< <= > >= = == != <>),
 * and / or / not, tanda kurung, dan fungsi round, abs, substr, upper, lower, len, coalesce.
 */
export type Value = number | string | boolean | null;
type Row = Record<string, Value>;

type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'lit'; v: Value }
  | { t: 'col'; name: string }
  | { t: 'un'; op: string; a: Node }
  | { t: 'bin'; op: string; a: Node; b: Node }
  | { t: 'call'; fn: string; args: Node[] };

interface Tok {
  k: 'num' | 'str' | 'id' | 'op' | 'eof';
  v: string;
}

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i;
      while (j < src.length && /[0-9._]/.test(src[j])) j++;
      out.push({ k: 'num', v: src.slice(i, j).replace(/_/g, '') });
      i = j;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== c) s += src[j++];
      out.push({ k: 'str', v: s });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_À-ɏ]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_À-ɏ]/.test(src[j])) j++;
      out.push({ k: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['<=', '>=', '==', '!=', '<>'].includes(two)) {
      out.push({ k: 'op', v: two });
      i += 2;
      continue;
    }
    if ('+-*/%()<>=,'.includes(c)) {
      out.push({ k: 'op', v: c });
      i++;
      continue;
    }
    throw new Error(`Karakter tidak dikenal: ${c}`);
  }
  out.push({ k: 'eof', v: '' });
  return out;
}

const PREC: Record<string, number> = {
  or: 1,
  and: 2,
  '=': 4,
  '==': 4,
  '!=': 4,
  '<>': 4,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
};

export function parseExpr(src: string): Node {
  const toks = lex(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];

  const primary = (): Node => {
    const t = next();
    if (t.k === 'num') return { t: 'num', v: Number(t.v) };
    if (t.k === 'str') return { t: 'str', v: t.v };
    if (t.k === 'op' && t.v === '(') {
      const e = expr(0);
      if (next().v !== ')') throw new Error('Kurung tutup hilang');
      return e;
    }
    if (t.k === 'op' && t.v === '-') return { t: 'un', op: '-', a: unary() };
    if (t.k === 'id') {
      const low = t.v.toLowerCase();
      if (low === 'not') return { t: 'un', op: 'not', a: unary() };
      if (low === 'true' || low === 'false') return { t: 'lit', v: low === 'true' };
      if (low === 'null' || low === 'none') return { t: 'lit', v: null };
      if (peek().v === '(') {
        next();
        const args: Node[] = [];
        if (peek().v !== ')') {
          args.push(expr(0));
          while (peek().v === ',') {
            next();
            args.push(expr(0));
          }
        }
        if (next().v !== ')') throw new Error('Kurung tutup fungsi hilang');
        return { t: 'call', fn: low, args };
      }
      return { t: 'col', name: t.v };
    }
    throw new Error(`Ekspresi tidak valid di dekat "${t.v}"`);
  };
  const unary = (): Node => primary();
  const expr = (minPrec: number): Node => {
    let left = unary();
    for (;;) {
      const t = peek();
      const op = t.k === 'id' ? t.v.toLowerCase() : t.v;
      const prec = PREC[op];
      if ((t.k !== 'op' && t.k !== 'id') || prec === undefined || prec < minPrec) break;
      next();
      const right = expr(prec + 1);
      left = { t: 'bin', op, a: left, b: right };
    }
    return left;
  };
  const e = expr(0);
  if (peek().k !== 'eof') throw new Error(`Sisa ekspresi tidak terbaca: "${peek().v}"`);
  return e;
}

function num(v: Value): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === null) return NaN;
  const n = Number(v);
  return n;
}

function cmp(a: Value, b: Value): number {
  if (typeof a === 'number' || typeof b === 'number') return num(a) - num(b);
  return String(a ?? '').localeCompare(String(b ?? ''));
}

function evalNode(n: Node, row: Row): Value {
  switch (n.t) {
    case 'num':
      return n.v;
    case 'str':
      return n.v;
    case 'lit':
      return n.v;
    case 'col': {
      if (n.name in row) return row[n.name];
      const key = Object.keys(row).find((k) => k.toLowerCase() === n.name.toLowerCase());
      return key ? row[key] : null;
    }
    case 'un': {
      const a = evalNode(n.a, row);
      if (n.op === '-') return -num(a);
      return !a;
    }
    case 'bin': {
      if (n.op === 'and') return Boolean(evalNode(n.a, row)) && Boolean(evalNode(n.b, row));
      if (n.op === 'or') return Boolean(evalNode(n.a, row)) || Boolean(evalNode(n.b, row));
      const a = evalNode(n.a, row);
      const b = evalNode(n.b, row);
      switch (n.op) {
        case '+':
          return typeof a === 'string' || typeof b === 'string' ? `${a ?? ''}${b ?? ''}` : num(a) + num(b);
        case '-':
          return num(a) - num(b);
        case '*':
          return num(a) * num(b);
        case '/':
          return num(b) === 0 ? null : num(a) / num(b);
        case '%':
          return num(a) % num(b);
        case '=':
        case '==':
          return a === null || b === null ? a === b : cmp(a, b) === 0;
        case '!=':
        case '<>':
          return a === null || b === null ? a !== b : cmp(a, b) !== 0;
        case '<':
          return a !== null && b !== null && cmp(a, b) < 0;
        case '<=':
          return a !== null && b !== null && cmp(a, b) <= 0;
        case '>':
          return a !== null && b !== null && cmp(a, b) > 0;
        case '>=':
          return a !== null && b !== null && cmp(a, b) >= 0;
      }
      return null;
    }
    case 'call': {
      const args = n.args.map((x) => evalNode(x, row));
      switch (n.fn) {
        case 'round': {
          const d = args.length > 1 ? num(args[1]) : 0;
          const f = Math.pow(10, d);
          return Math.round(num(args[0]) * f) / f;
        }
        case 'abs':
          return Math.abs(num(args[0]));
        case 'substr':
        case 'substring': {
          const s = String(args[0] ?? '');
          const start = Math.max(0, num(args[1]) - 1);
          return args.length > 2 ? s.substr(start, num(args[2])) : s.slice(start);
        }
        case 'upper':
          return String(args[0] ?? '').toUpperCase();
        case 'lower':
          return String(args[0] ?? '').toLowerCase();
        case 'len':
        case 'length':
          return String(args[0] ?? '').length;
        case 'coalesce':
          return args.find((x) => x !== null && x !== undefined) ?? null;
      }
      throw new Error(`Fungsi tidak dikenal: ${n.fn}`);
    }
  }
}

const cache = new Map<string, Node>();

export function evaluate(src: string, row: Row): Value {
  let node = cache.get(src);
  if (!node) {
    node = parseExpr(src);
    cache.set(src, node);
  }
  const v = evalNode(node, row);
  return typeof v === 'number' && !Number.isFinite(v) ? null : v;
}
