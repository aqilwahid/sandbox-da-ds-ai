import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Code2, LayoutList } from 'lucide-react';
import { DEFAULT_PREFS, getPrefs, setPref } from '../../lib/prefs';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Props {
  sidebar: React.ReactNode;
  sidebarCollapsed: boolean;
  instructions: React.ReactNode;
  editor: React.ReactNode;
  output: React.ReactNode;
  /** Dipanggil ketika tampilan HP ingin fokus ke tab tertentu (mis. setelah Run → Hasil). */
  mobileFocus?: 'instruksi' | 'kode' | 'hasil';
}

function useIsNarrow(bp = 1024) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < bp);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [bp]);
  return narrow;
}

const Splitter: React.FC<{
  dir: 'x' | 'y';
  onDrag: (clientX: number, clientY: number) => void;
  /** Geser dengan keyboard (panah) — delta dalam persen/px sesuai panel. */
  onNudge: (delta: number) => void;
  onReset: () => void;
  label: string;
}> = ({ dir, onDrag, onNudge, onReset, label }) => {
  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    document.body.style.cursor = dir === 'x' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    const move = (ev: PointerEvent) => onDrag(ev.clientX, ev.clientY);
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };
  return (
    <div
      role="separator"
      aria-orientation={dir === 'x' ? 'vertical' : 'horizontal'}
      aria-label={label}
      tabIndex={0}
      title={`${label} — seret, atau fokus lalu tekan tombol panah. Klik ganda untuk ukuran awal.`}
      onPointerDown={start}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const back = dir === 'x' ? 'ArrowLeft' : 'ArrowUp';
        const fwd = dir === 'x' ? 'ArrowRight' : 'ArrowDown';
        if (e.key === back || e.key === fwd) {
          e.preventDefault();
          onNudge((e.key === fwd ? 1 : -1) * (e.shiftKey ? 5 : 1));
        }
      }}
      className={`group relative z-10 shrink-0 bg-line outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent ${dir === 'x' ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize'}`}
    >
      <span className={`absolute ${dir === 'x' ? '-left-1.5 -right-1.5 inset-y-0' : '-top-1.5 -bottom-1.5 inset-x-0'}`} />
    </div>
  );
};

export const ResizablePanels: React.FC<Props> = ({ sidebar, sidebarCollapsed, instructions, editor, output, mobileFocus }) => {
  const narrow = useIsNarrow();
  const prefs = getPrefs();
  const [sidebarW, setSidebarW] = useState(prefs.sidebarWidth);
  const [instrPct, setInstrPct] = useState(prefs.instructionWidth);
  const [editorPct, setEditorPct] = useState(prefs.editorSplit);
  const [mobileTab, setMobileTab] = useState<'instruksi' | 'kode' | 'hasil'>('instruksi');
  const mainRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mobileFocus) setMobileTab(mobileFocus);
  }, [mobileFocus]);

  const persist = useCallback(() => {
    setPref('sidebarWidth', sidebarW);
    setPref('instructionWidth', instrPct);
    setPref('editorSplit', editorPct);
  }, [sidebarW, instrPct, editorPct]);
  useEffect(() => {
    const t = setTimeout(persist, 400);
    return () => clearTimeout(t);
  }, [persist]);

  if (narrow) {
    const Tab: React.FC<{ id: typeof mobileTab; icon: React.ReactNode; label: string }> = ({ id, icon, label }) => (
      <button type="button" onClick={() => setMobileTab(id)} className={`tab flex-1 justify-center ${mobileTab === id ? 'tab-active' : ''}`}>
        {icon} {label}
      </button>
    );
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 gap-1 border-b border-line bg-panel p-1">
          <Tab id="instruksi" icon={<BookOpen size={13} />} label="Instruksi" />
          <Tab id="kode" icon={<Code2 size={13} />} label="Kode" />
          <Tab id="hasil" icon={<LayoutList size={13} />} label="Hasil" />
        </div>
        <div className="min-h-0 flex-1">
          <div className={mobileTab === 'instruksi' ? 'h-full' : 'hidden'}>{instructions}</div>
          <div className={mobileTab === 'kode' ? 'h-full' : 'hidden'}>{editor}</div>
          <div className={mobileTab === 'hasil' ? 'h-full' : 'hidden'}>{output}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div style={{ width: sidebarCollapsed ? 48 : sidebarW }} className="h-full shrink-0 overflow-hidden">
        {sidebar}
      </div>
      {!sidebarCollapsed && (
        <Splitter
          dir="x"
          label="Ubah lebar daftar latihan"
          onDrag={(x) => setSidebarW(clamp(x, 200, 400))}
          onNudge={(d) => setSidebarW((w) => clamp(w + d * 10, 200, 400))}
          onReset={() => setSidebarW(DEFAULT_PREFS.sidebarWidth)}
        />
      )}
      <div ref={mainRef} className="flex min-w-0 flex-1 overflow-hidden">
        <div style={{ width: `${instrPct}%` }} className="h-full min-w-[280px] shrink-0 overflow-hidden">
          {instructions}
        </div>
        <Splitter
          dir="x"
          label="Ubah lebar panel instruksi"
          onDrag={(x) => {
            const box = mainRef.current?.getBoundingClientRect();
            if (!box) return;
            setInstrPct(clamp(((x - box.left) / box.width) * 100, 24, 64));
          }}
          onNudge={(d) => setInstrPct((p) => clamp(p + d, 24, 64))}
          onReset={() => setInstrPct(DEFAULT_PREFS.instructionWidth)}
        />
        <div ref={rightRef} className="flex min-w-[340px] flex-1 flex-col overflow-hidden">
          <div style={{ height: `${editorPct}%` }} className="min-h-[120px] shrink-0 overflow-hidden">
            {editor}
          </div>
          <Splitter
            dir="y"
            label="Ubah tinggi editor"
            onDrag={(_, y) => {
              const box = rightRef.current?.getBoundingClientRect();
              if (!box) return;
              setEditorPct(clamp(((y - box.top) / box.height) * 100, 20, 80));
            }}
            onNudge={(d) => setEditorPct((p) => clamp(p + d * 2, 20, 80))}
            onReset={() => setEditorPct(DEFAULT_PREFS.editorSplit)}
          />
          <div className="min-h-0 flex-1 overflow-hidden">{output}</div>
        </div>
      </div>
    </div>
  );
};
