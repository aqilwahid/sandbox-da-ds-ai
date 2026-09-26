import React, { useEffect, useState } from 'react';
import { ChevronRight, Lightbulb } from 'lucide-react';
import { Modal } from '../common/Modal';
import { MarkdownView } from '../instructions/MarkdownView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  hints: string[];
  used: number;
  language: 'sql' | 'python';
  onUnlock: (level: number) => void;
}

const LEVEL_NAME = ['Arah konsep', 'Potongan kode', 'Hampir lengkap', 'Petunjuk tambahan'];

export const HintModal: React.FC<Props> = ({ isOpen, onClose, hints, used, language, onUnlock }) => {
  const [level, setLevel] = useState(Math.max(1, used));
  useEffect(() => {
    if (isOpen) {
      const lv = Math.max(1, used);
      setLevel(lv);
      if (used < 1 && hints.length) onUnlock(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const canMore = level < hints.length;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Lightbulb size={16} className="text-warn" /> Petunjuk bertahap
        </span>
      }
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xs text-fg3">
            Terbuka {level} dari {hints.length}. Coba dulu sebelum membuka petunjuk berikutnya.
          </span>
          {canMore ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const n = level + 1;
                setLevel(n);
                onUnlock(n);
              }}
            >
              Buka petunjuk #{level + 1} <ChevronRight size={13} />
            </button>
          ) : (
            <button type="button" className="btn" onClick={onClose}>
              Kembali ke kode
            </button>
          )}
        </div>
      }
    >
      <ol className="space-y-3">
        {hints.slice(0, level).map((h, i) => (
          <li key={i} className="rounded-xl border border-line bg-panel2 p-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-fg">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warn/20 text-[10px] font-bold text-warn">{i + 1}</span>
                Petunjuk {i + 1}
              </span>
              <span className="text-2xs text-fg3">{LEVEL_NAME[Math.min(i, LEVEL_NAME.length - 1)]}</span>
            </div>
            <MarkdownView source={h} language={language} className="!text-[0.85rem]" />
          </li>
        ))}
      </ol>
    </Modal>
  );
};
