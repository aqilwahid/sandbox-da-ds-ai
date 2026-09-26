import React from 'react';
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';
import type { CheckResult } from '../../runtime/types';

interface Props {
  check: CheckResult | null;
  checking: boolean;
  hasError: boolean;
  hasRun: boolean;
  onNext?: () => void;
  hasNext: boolean;
  onShowPembahasan?: () => void;
}

export const GraderView: React.FC<Props> = ({ check, checking, hasError, hasRun, onNext, hasNext, onShowPembahasan }) => {
  if (checking) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-fg2">
        <Loader2 size={14} className="animate-spin text-accent" /> Memeriksa hasilmu…
      </div>
    );
  }
  if (!check) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-fg3">
        <CircleDashed size={20} />
        {hasError
          ? 'Perbaiki error di tab Hasil dulu — penilaian dijalankan setelah kode berjalan tanpa error.'
          : hasRun
            ? 'Penilaian belum tersedia.'
            : 'Jalankan kode untuk melihat checklist penilaian otomatis.'}
      </div>
    );
  }
  const pct = check.totalCount ? Math.round((check.passedCount / check.totalCount) * 100) : 0;
  return (
    <div className="space-y-3 p-3">
      <div className={`rounded-xl border p-3.5 ${check.passed ? 'border-ok/40 bg-ok/[0.07]' : 'border-warn/40 bg-warn/[0.07]'}`}>
        <div className="flex items-start gap-3">
          {check.passed ? <CheckCircle2 size={22} className="shrink-0 text-ok" /> : <XCircle size={22} className="shrink-0 text-warn" />}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-fg">{check.passed ? 'Lulus! Semua kriteria terpenuhi' : 'Belum lulus — hampir sampai'}</h4>
            <p className="mt-0.5 text-xs text-fg2">{check.message}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel3">
                <div className={`h-full rounded-full ${check.passed ? 'bg-ok' : 'bg-warn'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-2xs font-medium text-fg2 tabular">
                {check.passedCount}/{check.totalCount} kriteria
              </span>
            </div>
          </div>
        </div>
        {check.passed && (
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {onShowPembahasan && (
              <button type="button" className="btn" onClick={onShowPembahasan}>
                <BookOpenCheck size={13} /> Baca pembahasan
              </button>
            )}
            {hasNext && onNext && (
              <button type="button" className="btn-primary" onClick={onNext}>
                Latihan berikutnya <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}
      </div>
      <ol className="space-y-1.5">
        {check.tests.map((t, i) => (
          <li
            key={i}
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs ${t.passed ? 'border-line bg-panel' : 'border-err/35 bg-err/[0.05]'}`}
          >
            {t.passed ? <CheckCircle2 size={15} className="mt-px shrink-0 text-ok" /> : <XCircle size={15} className="mt-px shrink-0 text-err" />}
            <div className="min-w-0">
              <div className={t.passed ? 'text-fg2' : 'font-medium text-fg'}>{renderInlineCode(t.label)}</div>
              {!t.passed && t.detail && <div className="mt-0.5 text-fg2">{renderInlineCode(t.detail)}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

/** Ubah `kode` menjadi <code> tanpa HTML mentah. */
export function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith('`') && p.endsWith('`') ? (
      <code key={i} className="rounded bg-panel3 px-1 py-px font-mono text-[0.92em] text-fg">
        {p.slice(1, -1)}
      </code>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );
}
