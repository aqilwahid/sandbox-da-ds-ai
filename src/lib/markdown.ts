import { Marked } from 'marked';
import { escapeHtml } from './format';
import { highlightToHtml } from './highlight';

export type Segment = { type: 'md'; html: string } | { type: 'visual'; yaml: string; key: string };

const VISUAL_RE = /^```visual[^\n]*\n([\s\S]*?)\n```[ \t]*$/gm;

const md = new Marked({ gfm: true, breaks: false });
md.use({
  renderer: {
    code(token: { text: string; lang?: string }) {
      const lang = (token.lang || '').trim().split(/\s+/)[0];
      const label = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : '';
      return (
        `<div class="code-wrap" data-lang="${escapeHtml(lang)}">` +
        `<div class="code-bar">${label}<button type="button" class="code-copy" data-copy>Salin</button></div>` +
        `<pre><code>${highlightToHtml(token.text, lang)}</code></pre></div>`
      );
    },
    link(token: { href: string; title?: string | null; text: string }) {
      const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
      return `<a href="${escapeHtml(token.href)}"${title} target="_blank" rel="noopener noreferrer">${token.text}</a>`;
    },
  },
});

export function renderMarkdown(src: string): string {
  try {
    return md.parse(src, { async: false }) as string;
  } catch (e) {
    return `<p>Gagal merender teks: ${escapeHtml(String(e))}</p>`;
  }
}

/** Pecah markdown menjadi potongan teks biasa dan blok ```visual. */
export function splitSegments(src: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  let i = 0;
  VISUAL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = VISUAL_RE.exec(src)) !== null) {
    const before = src.slice(last, m.index);
    if (before.trim()) out.push({ type: 'md', html: renderMarkdown(before) });
    out.push({ type: 'visual', yaml: m[1], key: `v${i++}` });
    last = m.index + m[0].length;
  }
  const rest = src.slice(last);
  if (rest.trim()) out.push({ type: 'md', html: renderMarkdown(rest) });
  return out;
}
