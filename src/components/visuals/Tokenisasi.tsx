import React, { useMemo, useState } from 'react';
import { formatNumber } from '../../lib/format';
import { countWords, tokenId, tokenize } from '../../lib/tokenizer';
import { groupBg, VisualFrame } from './shared';

export const Tokenisasi: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const [text, setText] = useState(String(spec.teks || 'Pengiriman paket ini sangat cepat, terima kasih!'));
  const [showIds, setShowIds] = useState(false);
  const tokens = useMemo(() => tokenize(text), [text]);
  const words = countWords(text);
  const ratio = words ? tokens.length / words : 0;
  const cost = (tokens.length / 1000) * 15;
  return (
    <VisualFrame
      kind="Tokenizer interaktif"
      title={(spec.judul as string) || 'Ketik kalimat dan lihat bagaimana LLM memecahnya menjadi token'}
      caption={(spec.keterangan as string) || 'Tokenizer ini sama persis dengan simulasi_llm.tokenisasi di kode. Titik tengah (·) menandai spasi yang ikut menempel di token.'}
      controls={
        <label className="flex items-center gap-1.5 text-2xs text-fg2">
          <input type="checkbox" checked={showIds} onChange={(e) => setShowIds(e.target.checked)} /> ID token
        </label>
      }
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="input resize-y font-sans !text-sm"
        aria-label="Teks yang akan ditokenisasi"
      />
      <div className="mt-3 flex min-h-[44px] flex-wrap gap-1 rounded-lg border border-line bg-panel2 p-2" aria-label="Hasil tokenisasi">
        {tokens.map((t, i) =>
          t === '\n' ? (
            <span key={i} className="basis-full" />
          ) : (
            <span
              key={i}
              className="inline-flex flex-col items-center rounded-md px-1.5 py-1 font-mono text-xs text-fg"
              style={{ background: groupBg(i), boxShadow: 'inset 0 0 0 1px rgb(var(--c-line))' }}
              title={`Token #${i + 1} · ID ${tokenId(t)}`}
            >
              <span className="whitespace-pre">
                {t.startsWith(' ') ? <span className="text-fg3">·</span> : null}
                {t.replace(/^ +/, '')}
              </span>
              {showIds && <span className="text-[9.5px] text-fg3 tabular">{tokenId(t)}</span>}
            </span>
          ),
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[
          ['Karakter', formatNumber(text.length)],
          ['Kata', formatNumber(words)],
          ['Token', formatNumber(tokens.length)],
          ['Token per kata', ratio ? ratio.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-panel2 px-2.5 py-1.5">
            <div className="text-2xs text-fg3">{k}</div>
            <div className="text-base font-semibold text-fg tabular">{v}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-2xs text-fg2">
        Estimasi biaya input (tarif fiktif Rp15 per 1.000 token): <strong className="text-fg">Rp{cost.toLocaleString('id-ID', { maximumFractionDigits: 3 })}</strong>. Kata umum
        menjadi 1 token; kata berimbuhan atau jarang dipecah (mis. <code className="font-mono">Di|kembali|kan</code>).
      </p>
    </VisualFrame>
  );
};
