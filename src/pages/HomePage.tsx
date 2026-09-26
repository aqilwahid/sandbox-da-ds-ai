import React from 'react';
import { ArrowRight, BarChart3, BookOpen, CheckCircle2, Code2, Gauge, ShieldCheck, WifiOff } from 'lucide-react';
import { APP } from '../config';
import { exercisesByTrack, getContent } from '../content/loader';
import { TRACK_IDS, TRACKS, type TrackId } from '../content/types';
import { useAllProgress } from '../db/hooks';
import { getPrefs } from '../lib/prefs';
import { navigate } from '../lib/router';
import { useRuntimeState } from '../runtime/pythonRuntime';

const TRACK_ART: Record<TrackId, React.ReactNode> = {
  analyst: (
    <svg viewBox="0 0 120 64" className="h-16 w-full" aria-hidden>
      {[26, 40, 18, 48, 34].map((h, i) => (
        <rect key={i} x={10 + i * 22} y={60 - h} width="12" height={h} rx="3" fill="rgb(var(--c-track-analyst))" opacity={0.35 + i * 0.13} />
      ))}
      <path d="M8 40 L30 30 L52 36 L74 16 L96 22 L114 8" fill="none" stroke="rgb(var(--c-track-analyst))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  datascience: (
    <svg viewBox="0 0 120 64" className="h-16 w-full" aria-hidden>
      {[
        [14, 50], [22, 44], [30, 46], [38, 36], [46, 38], [54, 30], [62, 28], [70, 24], [80, 20], [90, 14], [100, 16], [108, 9],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="rgb(var(--c-track-datascience))" opacity="0.7" />
      ))}
      <line x1="10" y1="54" x2="112" y2="8" stroke="rgb(var(--c-track-datascience))" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 120 64" className="h-16 w-full" aria-hidden>
      {['Peng', 'irim', 'an', ' cepat', '!'].map((t, i) => (
        <g key={i}>
          <rect x={6 + i * 22.5} y="12" width="20" height="16" rx="4" fill="rgb(var(--c-track-ai))" opacity={0.25 + i * 0.12} />
          <text x={16 + i * 22.5} y="23.5" fontSize="7" textAnchor="middle" fill="rgb(var(--c-fg))" fontFamily="monospace">
            {t.trim()}
          </text>
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${16 + i * 22.5} 30 C ${20 + i * 22.5} 44, ${50 + i * 8} 44, ${60 + i * 4} 54`} stroke="rgb(var(--c-track-ai))" strokeWidth="1.5" fill="none" opacity="0.5" />
      ))}
      <circle cx="68" cy="56" r="5" fill="rgb(var(--c-track-ai))" />
    </svg>
  ),
};

export const HomePage: React.FC = () => {
  const progress = useAllProgress();
  const rt = useRuntimeState();
  const { exercises } = getContent();
  const totalPassed = exercises.filter((e) => progress[e.id]?.status === 'lulus').length;

  const openTrack = (t: TrackId) => {
    const list = exercisesByTrack(t);
    const last = getPrefs().lastExercise[t];
    const firstUnfinished = list.find((e) => progress[e.id]?.status !== 'lulus');
    const target = list.find((e) => e.id === last) || firstUnfinished || list[0];
    if (target) navigate({ name: 'exercise', id: target.id });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-5 py-8 md:py-12">
        <section className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            {(APP.trainingTitle || APP.organization) && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">{APP.trainingTitle || APP.organization}</p>
            )}
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-fg md:text-[2.4rem]">
              Belajar data & AI dengan <span className="text-accent">melihat langsung</span> hasilnya.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg2">
              SQL sungguhan, Python + pandas, dan simulasi aplikasi LLM — semuanya berjalan di browser. Setiap langkah punya visual interaktif, tabel & grafik
              otomatis, serta penilaian yang menjelaskan apa yang perlu diperbaiki.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn-primary !px-4 !py-2 !text-sm" onClick={() => openTrack((getPrefs().lastTrack as TrackId) || 'analyst')}>
                {totalPassed ? 'Lanjutkan belajar' : 'Mulai belajar'} <ArrowRight size={15} />
              </button>
              <button type="button" className="btn !px-3.5 !py-2 !text-sm" onClick={() => navigate({ name: 'preflight' })}>
                <Gauge size={15} /> Cek kesiapan perangkat
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-2xs text-fg3">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-ok" /> Tanpa instalasi & tanpa akun
              </span>
              <span className="flex items-center gap-1.5">
                <WifiOff size={13} className="text-ok" /> Bisa offline setelah disiapkan
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-ok" /> Progres tersimpan di browser
              </span>
            </div>
          </div>
          <div className="card p-4">
            <div className="text-2xs font-semibold uppercase tracking-wider text-fg3">Cara kerja</div>
            <ol className="mt-3 space-y-3">
              {[
                { icon: <BookOpen size={15} />, t: 'Pahami konsepnya', d: 'Instruksi singkat + visual interaktif (klik, geser, putar).' },
                { icon: <Code2 size={15} />, t: 'Tulis & jalankan kode', d: 'Ctrl + Enter — hasil tampil sebagai tabel, grafik, atau KPI.' },
                { icon: <BarChart3 size={15} />, t: 'Dapat umpan balik', d: 'Checklist penilaian, penjelasan error, hint bertahap, pembahasan.' },
              ].map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">{s.icon}</span>
                  <span>
                    <span className="block text-xs font-semibold text-fg">
                      {i + 1}. {s.t}
                    </span>
                    <span className="block text-2xs leading-relaxed text-fg2">{s.d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg border border-line bg-panel2 px-3 py-2 text-2xs text-fg2">
              Status Python:{' '}
              <strong className={rt.status === 'ready' ? 'text-ok' : rt.status === 'error' ? 'text-err' : 'text-warn'}>
                {rt.status === 'ready' ? 'siap dipakai' : rt.status === 'error' ? 'gagal dimuat — buka Cek Kesiapan' : 'sedang disiapkan di latar belakang…'}
              </strong>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-fg">Pilih jalur belajar</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {TRACK_IDS.map((t) => {
              const list = exercisesByTrack(t);
              const passed = list.filter((e) => progress[e.id]?.status === 'lulus').length;
              const started = list.some((e) => progress[e.id]);
              const meta = TRACKS[t];
              return (
                <article key={t} className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-pop">
                  <div className="border-b border-line bg-panel2 px-4 pt-3">{TRACK_ART[t]}</div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-fg">{meta.name}</h3>
                      <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] font-semibold text-fg2">
                        {meta.language === 'sql' ? 'SQL' : 'Python'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium" style={{ color: `rgb(var(--c-track-${t}))` }}>
                      {meta.tagline}
                    </p>
                    <p className="mt-2 flex-1 text-2xs leading-relaxed text-fg2">{meta.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {meta.skills.map((s) => (
                        <span key={s} className="chip">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-2xs text-fg3">
                        <span>{list.length} latihan</span>
                        <span className="tabular">{passed} lulus</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel3">
                        <div className="h-full rounded-full bg-ok" style={{ width: `${list.length ? (passed / list.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <button type="button" className="btn-primary mt-4 w-full !py-2" onClick={() => openTrack(t)}>
                      {started ? 'Lanjutkan' : 'Mulai'} {meta.name} <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <p className="mt-10 text-center text-[10.5px] text-fg3">
          {APP.name} v{APP.version} · Semua dataset bersifat fiktif · Kode & progres hanya tersimpan di browser perangkat ini (ekspor lewat menu Progres).
        </p>
      </div>
    </div>
  );
};
