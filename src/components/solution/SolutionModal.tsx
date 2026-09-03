import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, Eye, Code } from 'lucide-react';
import { Modal } from '../common/Modal';

interface SolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  solutionCode: string;
  hasAlreadySeenSolution: boolean;
  onConfirmViewSolution: () => void;
}

export const SolutionModal: React.FC<SolutionModalProps> = ({
  isOpen,
  onClose,
  solutionCode,
  hasAlreadySeenSolution,
  onConfirmViewSolution,
}) => {
  const [confirmed, setConfirmed] = useState<boolean>(hasAlreadySeenSolution);
  const [copied, setCopied] = useState(false);

  // Sync state if already viewed
  React.useEffect(() => {
    if (hasAlreadySeenSolution) {
      setConfirmed(true);
    }
  }, [hasAlreadySeenSolution]);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirmViewSolution();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(solutionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy solution:', e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Jawaban Solusi Referensi"
      maxWidth="max-w-2xl"
    >
      {!confirmed ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 text-purple-200 text-xs flex items-start gap-3">
            <AlertTriangle size={20} className="text-purple-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold block text-sm text-purple-100 mb-1">
                Konfirmasi Melihat Solusi
              </span>
              Melihat kunci jawaban akan menandai status latihan ini sebagai{' '}
              <strong className="underline text-white">"Dilihat Solusinya"</strong>. Kami menyarankan Anda mencoba menggunakan fitur <em>Hint</em> bertahap terlebih dahulu sebelum membuka solusi penuh.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-slate-750 text-slate-300 text-xs font-medium transition-colors"
            >
              Kembali & Coba Lagi
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              <Eye size={14} />
              <span>Buka Kunci Solusi</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Code size={14} className="text-purple-400" />
              Kode Jawaban Resmi
            </span>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1 rounded bg-dark-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-dark-950 border border-slate-800 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed max-h-[380px]">
            <code>{solutionCode}</code>
          </pre>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-dark-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
