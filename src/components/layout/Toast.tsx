import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const ToastContext = createContext<{ showToast: (message: string, type?: ToastType) => void }>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

let seq = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const remove = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++seq;
    setToasts((t) => [...t.slice(-3), { id, type, message }]);
    setTimeout(() => remove(id), type === 'error' ? 6000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex animate-slide-up items-start gap-2.5 rounded-xl border bg-panel p-3 text-xs shadow-pop ${
              t.type === 'success' ? 'border-ok/40' : t.type === 'error' ? 'border-err/40' : 'border-line2'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 size={16} className="shrink-0 text-ok" />}
            {t.type === 'error' && <AlertCircle size={16} className="shrink-0 text-err" />}
            {t.type === 'info' && <Info size={16} className="shrink-0 text-info" />}
            <span className="flex-1 leading-relaxed text-fg">{t.message}</span>
            <button type="button" onClick={() => remove(t.id)} className="text-fg3 hover:text-fg" aria-label="Tutup notifikasi">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
