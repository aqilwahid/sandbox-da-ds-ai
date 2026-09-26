import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, ClipboardPaste, Copy, Eye } from 'lucide-react';
import { copyText } from '../../lib/format';
import { highlightToHtml } from '../../lib/highlight';
import { Modal } from '../common/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: 'sql' | 'python';
  alreadySeen: boolean;
  onConfirm: () => void;
  onPaste: () => void;
}

export const SolutionModal: React.FC<Props> = ({ isOpen, onClose, code, language, alreadySeen, onConfirm, onPaste }) => {
  const [confirmed, setConfirmed] = useState(alreadySeen);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (isOpen) setConfirmed(alreadySeen);
  }, [isOpen, alreadySeen]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Solusi referensi" maxWidth="max-w-3xl">
      {!confirmed ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-xs text-fg">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" />
            <div className="space-y-1 leading-relaxed">
              <strong className="block text-sm">Yakin ingin melihat solusi?</strong>
              Latihan ini akan ditandai <strong>“solusi dilihat”</strong> di catatan progres. Coba buka <em>Hint</em> bertahap dulu — belajar paling efektif saat
              kamu menemukan jawabannya sendiri.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn" onClick={onClose}>
              Coba lagi dulu
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setConfirmed(true);
                onConfirm();
              }}
            >
              <Eye size={13} /> Tampilkan solusi
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <pre className="max-h-[55vh] overflow-auto rounded-xl border border-line bg-panel2 p-4 font-mono text-xs leading-relaxed text-fg">
            <code dangerouslySetInnerHTML={{ __html: highlightToHtml(code, language) }} />
          </pre>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-2xs text-fg3">Pelajari logikanya, lalu coba tulis ulang dengan kata-katamu sendiri.</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  if (await copyText(code)) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }
                }}
              >
                {copied ? <Check size={13} className="text-ok" /> : <Copy size={13} />} Salin
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onPaste();
                  onClose();
                }}
                title="Ganti isi editor dengan solusi"
              >
                <ClipboardPaste size={13} /> Pakai di editor
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
