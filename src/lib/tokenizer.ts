/**
 * Port JavaScript dari `simulasi_llm.tokenisasi` (Python) — hasilnya harus identik.
 * Dipakai oleh visual "tokenisasi" agar peserta melihat token yang sama dengan di kode.
 */
import vocabJson from '../runtime/python/token_vocab.json';

const VOCAB: string[] = (vocabJson as { vocab: string[] }).vocab;
const INDEX = new Map<string, number>(VOCAB.map((w, i) => [w, i]));
const MAX_PIECE = VOCAB.reduce((m, w) => Math.max(m, w.length), 0);
const LETTERS = 'A-Za-zÀ-ɏ';
const TOKEN_RE = new RegExp(`(\\s*)([0-9]+|[${LETTERS}]+|[^\\s0-9${LETTERS}])`, 'g');
const LETTER_START = new RegExp(`^[${LETTERS}]`);

function splitWord(word: string): string[] {
  const low = word.toLowerCase();
  const pieces: string[] = [];
  let i = 0;
  while (i < word.length) {
    let take = 1;
    for (let L = Math.min(MAX_PIECE, word.length - i); L > 0; L--) {
      if (INDEX.has(low.slice(i, i + L))) {
        take = L;
        break;
      }
    }
    pieces.push(word.slice(i, i + take));
    i += take;
  }
  return pieces;
}

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let pos = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    let space = m[1];
    const word = m[2];
    pos = TOKEN_RE.lastIndex;
    if (space.includes('\n')) {
      const nl = space.split('\n').length - 1;
      for (let k = 0; k < nl; k++) tokens.push('\n');
      space = space.split('\n').pop() || '';
    }
    let chunks: string[];
    if (/^[0-9]+$/.test(word)) {
      chunks = [];
      for (let i = 0; i < word.length; i += 3) chunks.push(word.slice(i, i + 3));
    } else if (LETTER_START.test(word)) {
      chunks = splitWord(word);
    } else {
      chunks = [word];
    }
    chunks[0] = space + chunks[0];
    tokens.push(...chunks);
  }
  const tail = text.slice(pos);
  if (tail) {
    const nl = tail.split('\n').length - 1;
    for (let k = 0; k < nl; k++) tokens.push('\n');
    const rest = tail.replace(/\n/g, '');
    if (rest) tokens.push(rest);
  }
  return tokens;
}

export function tokenId(tok: string): number {
  const key = tok.trim().toLowerCase();
  const idx = INDEX.get(key);
  if (idx !== undefined) return idx + (tok === tok.trim() ? 0 : 1000);
  let sum = 0;
  for (const ch of key) sum += ch.codePointAt(0) || 0;
  return 5000 + (sum % 1000);
}

export function countWords(text: string): number {
  return (text.match(/\S+/g) || []).length;
}
