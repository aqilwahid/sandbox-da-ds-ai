import React, { useState } from 'react';
import { BarChart3, CircleHelp, Gauge, Home, Loader2, Moon, MonitorSmartphone, Sun, TriangleAlert, Type } from 'lucide-react';
import { APP } from '../../config';
import { setPref, usePrefs } from '../../lib/prefs';
import { navigate, type Route } from '../../lib/router';
import { useRuntimeState } from '../../runtime/pythonRuntime';
import { Modal } from '../common/Modal';
import { Logo } from './Logo';

const SIZES = ['md', 'lg', 'xl'] as const;
const SIZE_LABEL = { md: 'Normal', lg: 'Besar', xl: 'Sangat besar' };

export const Header: React.FC<{ route: Route }> = ({ route }) => {
  const prefs = usePrefs();
  const rt = useRuntimeState();
  const [help, setHelp] = useState(false);

  const NavBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button type="button" onClick={onClick} className={`tab ${active ? 'tab-active' : ''}`} aria-current={active ? 'page' : undefined}>
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  const rtPill = (() => {
    if (rt.status === 'error')
      return { cls: 'border-err/40 text-err', icon: <TriangleAlert size={12} />, text: 'Python gagal dimuat' };
    if (rt.status === 'loading')
      return {
        cls: 'border-warn/40 text-warn',
        icon: <Loader2 size={12} className="animate-spin" />,
        text: `Memuat Python${rt.progress ? ` ${Math.round(rt.progress)}%` : '…'}`,
      };
    if (rt.status === 'busy') return { cls: 'border-accent/40 text-accent', icon: <Loader2 size={12} className="animate-spin" />, text: rt.message };
    if (rt.status === 'ready') return { cls: 'border-ok/40 text-ok', icon: <span className="h-1.5 w-1.5 rounded-full bg-ok" />, text: 'Python siap' };
    return { cls: 'border-line text-fg3', icon: <span className="h-1.5 w-1.5 rounded-full bg-fg3" />, text: 'Python belum dimuat' };
  })();

  return (
    <header className="z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-line bg-panel px-3">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={() => navigate({ name: 'home' })} className="flex min-w-0 items-center gap-2 text-left" aria-label="Beranda">
          <Logo />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold tracking-tight text-fg">{APP.name}</span>
            {(APP.trainingTitle || APP.organization) && (
              <span className="block truncate text-[10.5px] text-fg3">{[APP.trainingTitle, APP.organization].filter(Boolean).join(' · ')}</span>
            )}
          </span>
        </button>
        <nav className="flex items-center gap-0.5" aria-label="Navigasi utama">
          <NavBtn active={route.name === 'home'} onClick={() => navigate({ name: 'home' })} icon={<Home size={14} />} label="Beranda" />
          <NavBtn active={route.name === 'progress'} onClick={() => navigate({ name: 'progress' })} icon={<BarChart3 size={14} />} label="Progres" />
          <NavBtn active={route.name === 'preflight'} onClick={() => navigate({ name: 'preflight' })} icon={<Gauge size={14} />} label="Cek Kesiapan" />
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => navigate({ name: 'preflight' })}
          className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-medium sm:inline-flex ${rtPill.cls}`}
          title={rt.error || rt.message}
        >
          {rtPill.icon}
          <span className="max-w-[180px] truncate">{rtPill.text}</span>
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setPref('size', SIZES[(SIZES.indexOf(prefs.size) + 1) % SIZES.length])}
          title={`Ukuran tampilan: ${SIZE_LABEL[prefs.size]} (mode presentasi)`}
          aria-label="Ganti ukuran tampilan"
        >
          <Type size={15} />
          <span className="text-[10px] font-semibold">{prefs.size === 'md' ? 'A' : prefs.size === 'lg' ? 'A+' : 'A++'}</span>
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setPref('theme', prefs.theme === 'dark' ? 'light' : 'dark')}
          title={prefs.theme === 'dark' ? 'Tema terang (cocok untuk proyektor)' : 'Tema gelap'}
          aria-label="Ganti tema"
        >
          {prefs.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setHelp(true)} title="Cara pakai" aria-label="Bantuan">
          <CircleHelp size={15} />
        </button>
      </div>
      <Modal isOpen={help} onClose={() => setHelp(false)} title="Cara memakai sandbox" maxWidth="max-w-2xl">
        <div className="space-y-4 text-xs leading-relaxed text-fg2">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Pilih <strong className="text-fg">track</strong> di Beranda, lalu buka latihan. Baca tab <strong className="text-fg">Instruksi</strong> — visualnya
              interaktif, coba klik!
            </li>
            <li>
              Lihat isi dataset di tab <strong className="text-fg">Data</strong> (SQL juga punya tab <strong className="text-fg">Target</strong>).
            </li>
            <li>
              Tulis kode di editor lalu tekan <span className="kbd">Ctrl</span>+<span className="kbd">Enter</span>. Hasil tampil sebagai tabel, grafik, dan
              checklist penilaian.
            </li>
            <li>
              Buntu? Buka <strong className="text-fg">Hint</strong> bertahap. Kode tersimpan otomatis di browser ini.
            </li>
          </ol>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['Ctrl + Enter', 'Jalankan & periksa'],
              ['Shift + Enter', 'Jalankan & periksa'],
              ['Ctrl + /', 'Komentari baris'],
              ['Ctrl + Z / Ctrl + Shift + Z', 'Undo / redo'],
              ['Tab', 'Indentasi'],
              ['Ctrl + Space', 'Saran nama kolom/fungsi'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-lg border border-line bg-panel2 px-2.5 py-1.5">
                <span className="font-mono text-2xs text-fg">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-panel2 p-2.5">
            <MonitorSmartphone size={14} className="mt-0.5 shrink-0 text-accent" />
            Semua kode berjalan di browser kamu (Python & DuckDB dalam WebAssembly) — tidak ada data yang dikirim ke server. Untuk proyektor, pakai tombol{' '}
            <strong className="text-fg">A+</strong> dan tema terang.
          </p>
        </div>
      </Modal>
    </header>
  );
};
