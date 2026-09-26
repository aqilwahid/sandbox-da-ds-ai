import React, { useState } from 'react';
import { Download, ImageIcon, Maximize2 } from 'lucide-react';
import type { ImageDisplay, TextDisplay } from '../../runtime/types';
import { Modal } from '../common/Modal';

export const FiguresView: React.FC<{ figures: (ImageDisplay | TextDisplay)[] }> = ({ figures }) => {
  const [zoom, setZoom] = useState<ImageDisplay | null>(null);
  if (!figures.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-fg3">
        <ImageIcon size={20} />
        Belum ada grafik. Buat grafik dengan matplotlib (mis. <code className="font-mono">plt.bar(...)</code>) — grafik ditangkap otomatis tanpa{' '}
        <code className="font-mono">plt.show()</code>.
      </div>
    );
  }
  return (
    <div className="grid gap-3 p-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
      {figures.map((f, i) =>
        f.type === 'image' ? (
          <figure key={i} className="overflow-hidden rounded-xl border border-line bg-panel shadow-card">
            <figcaption className="flex items-center justify-between gap-2 border-b border-line bg-panel2 px-3 py-1.5">
              <span className="truncate text-xs font-semibold text-fg">{f.title || `Grafik ${i + 1}`}</span>
              <span className="flex shrink-0 items-center gap-1">
                <button type="button" className="btn-ghost !px-1.5" onClick={() => setZoom(f)} title="Perbesar">
                  <Maximize2 size={13} />
                </button>
                <a className="btn-ghost !px-1.5" href={f.data} download={`grafik_${i + 1}.png`} title="Unduh PNG">
                  <Download size={13} />
                </a>
              </span>
            </figcaption>
            <button type="button" className="block w-full bg-white p-2" onClick={() => setZoom(f)}>
              <img src={f.data} alt={f.title || `Grafik ${i + 1}`} className="mx-auto max-h-[380px] w-auto" />
            </button>
          </figure>
        ) : (
          <pre key={i} className="rounded-xl border border-err/40 bg-err/5 p-3 text-xs text-err">
            {f.title}: {f.text}
          </pre>
        ),
      )}
      <Modal isOpen={!!zoom} onClose={() => setZoom(null)} title={zoom?.title || 'Grafik'} maxWidth="max-w-5xl">
        {zoom && <img src={zoom.data} alt={zoom.title || 'Grafik'} className="mx-auto max-h-[75vh] rounded-lg bg-white p-2" />}
      </Modal>
    </div>
  );
};
