import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { highlightToHtml } from '../../lib/highlight';
import { ResponsiveGrid, useVisualCtx, VisualFrame } from './shared';

interface Sisi {
  judul?: string;
  isi?: string;
  catatan?: string;
}

export const Perbandingan: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const ctx = useVisualCtx();
  const lang = String(spec.bahasa || ctx.language);
  const kiri = (spec.kiri || {}) as Sisi;
  const kanan = (spec.kanan || {}) as Sisi;
  const side = (s: Sisi, good: boolean) => (
    <div className={`flex min-w-0 flex-col overflow-hidden rounded-lg border ${good ? 'border-ok/40' : 'border-warn/40'}`}>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold ${good ? 'bg-ok/10 text-fg' : 'bg-warn/10 text-fg'}`}>
        {good ? <CheckCircle2 size={14} className="text-ok" /> : <XCircle size={14} className="text-warn" />}
        {s.judul || (good ? 'Lebih baik' : 'Kurang tepat')}
      </div>
      <pre className="flex-1 overflow-x-auto whitespace-pre-wrap break-words bg-panel2 px-3 py-2 font-mono text-xs leading-relaxed text-fg">
        {lang === 'teks' ? s.isi : <code dangerouslySetInnerHTML={{ __html: highlightToHtml(String(s.isi ?? ''), lang) }} />}
      </pre>
      {s.catatan && <div className="border-t border-line px-3 py-1.5 text-2xs text-fg2">{s.catatan}</div>}
    </div>
  );
  return (
    <VisualFrame kind="Perbandingan" title={spec.judul as string | undefined} caption={spec.keterangan as string | undefined}>
      <ResponsiveGrid min={600} wide="grid-cols-2" className="gap-3">
        {side(kiri, false)}
        {side(kanan, true)}
      </ResponsiveGrid>
    </VisualFrame>
  );
};
