const nfCache = new Map<string, Intl.NumberFormat>();

function nf(opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(opts);
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('id-ID', opts);
    nfCache.set(key, f);
  }
  return f;
}

/** 1234567.891 → "1.234.567,89" */
export function formatNumber(v: number, maxFrac = 2): string {
  if (!Number.isFinite(v)) return String(v);
  const abs = Math.abs(v);
  const frac = abs !== 0 && abs < 1 ? Math.max(maxFrac, 4) : maxFrac;
  return nf({ maximumFractionDigits: frac }).format(v);
}

/** 336093100 → "336,1 jt"; 45000 → "45 rb" */
export function formatCompact(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (Math.abs(v) < 1000) return formatNumber(v, 2);
  return nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

export function formatPercent(v: number, digits = 1): string {
  return nf({ style: 'percent', maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1).replace('.', ',')} dtk`;
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const DATE_RE = /^\d{4}-\d{2}(-\d{2})?([ T]\d{2}:\d{2}(:\d{2})?)?$/;
export function isDateLike(v: unknown): boolean {
  return typeof v === 'string' && DATE_RE.test(v);
}

export function formatCell(v: unknown, kind?: string): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    if (kind === 'text') return String(v);
    return formatNumber(v, Number.isInteger(v) ? 0 : 4);
  }
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function toCsv(columns: string[], rows: unknown[][]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
