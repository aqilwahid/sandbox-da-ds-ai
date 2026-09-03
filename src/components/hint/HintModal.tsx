import React, { useState } from 'react';
import { Lightbulb, ChevronRight, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { marked } from 'marked';

interface HintModalProps {
  isOpen: boolean;
  onClose: () => void;
  hints: string[];
  initialHintsUsed: number;
  onUseHint: (newLevel: number) => void;
}

export const HintModal: React.FC<HintModalProps> = ({
  isOpen,
  onClose,
  hints,
  initialHintsUsed,
  onUseHint,
}) => {
  const [currentLevel, setCurrentLevel] = useState<number>(Math.max(1, initialHintsUsed || 1));

  const totalHints = hints.length;
  const canUnlockMore = currentLevel < totalHints;

  const handleUnlockNext = () => {
    if (canUnlockMore) {
      const nextLevel = currentLevel + 1;
      setCurrentLevel(nextLevel);
      onUseHint(nextLevel);
    }
  };

  const renderHintContent = (hintMarkdown: string) => {
    try {
      return marked.parse(hintMarkdown, { async: false }) as string;
    } catch {
      return hintMarkdown;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Petunjuk Latihan (Tingkat ${currentLevel} dari ${totalHints})`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Tier description notice */}
        <div className="text-xs text-slate-400 bg-dark-950 p-3 rounded-lg border border-slate-800 flex items-center gap-2">
          <Lightbulb size={16} className="text-amber-400 shrink-0" />
          <span>
            Petunjuk dirancang bertahap: mengarahkan konsep (Tingkat 1) → memberi potongan kode (Tingkat 2) → struktur lengkap (Tingkat 3).
          </span>
        </div>

        {/* Hints accordion / list */}
        <div className="space-y-3">
          {hints.slice(0, currentLevel).map((hint, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-dark-850 border border-slate-750 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-[11px] font-mono">
                    {idx + 1}
                  </span>
                  Petunjuk #{idx + 1}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {idx === 0 ? 'Arah Konsep' : idx === 1 ? 'Struktur Kode' : 'Solusi Hampir Penuh'}
                </span>
              </div>

              <div
                className="prose-dark text-xs text-slate-300 max-w-none"
                dangerouslySetInnerHTML={{ __html: renderHintContent(hint) }}
              />
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <span className="text-[11px] text-slate-500 font-mono">
            Petunjuk terbuka: {currentLevel} / {totalHints}
          </span>

          <div className="flex items-center gap-2">
            {canUnlockMore ? (
              <button
                onClick={handleUnlockNext}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                <span>Buka Petunjuk #{currentLevel + 1}</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check size={14} />
                Semua petunjuk terbuka
              </span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
