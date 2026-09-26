import { python } from '@codemirror/lang-python';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { classHighlighter, highlightCode } from '@lezer/highlight';
import { escapeHtml } from './format';

const sqlParser = sql({ dialect: PostgreSQL }).language.parser;
const pyParser = python().language.parser;

/** Highlight statis (tanpa editor) → HTML dengan kelas .tok-* yang diwarnai lewat CSS. */
export function highlightToHtml(code: string, lang: string): string {
  const l = lang.toLowerCase();
  const parser = l === 'sql' ? sqlParser : l === 'python' || l === 'py' ? pyParser : null;
  if (!parser) return escapeHtml(code);
  let html = '';
  try {
    highlightCode(
      code,
      parser.parse(code),
      classHighlighter,
      (text, classes) => {
        html += classes ? `<span class="${classes}">${escapeHtml(text)}</span>` : escapeHtml(text);
      },
      () => {
        html += '\n';
      },
    );
    return html;
  } catch {
    return escapeHtml(code);
  }
}
