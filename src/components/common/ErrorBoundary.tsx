import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  error: Error | null;
}

/** Mencegah layar kosong: jika satu komponen error, tampilkan pesan & tombol muat ulang. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; label?: string; compact?: boolean }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.label ?? 'UI'}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.compact) {
      return (
        <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs text-fg">
          <strong>{this.props.label ?? 'Komponen'} gagal ditampilkan.</strong>
          <div className="mt-1 font-mono text-2xs text-fg2">{this.state.error.message}</div>
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle size={28} className="text-warn" />
        <div>
          <h2 className="text-sm font-semibold text-fg">Terjadi kesalahan pada tampilan</h2>
          <p className="mt-1 max-w-md font-mono text-2xs text-fg2">{this.state.error.message}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
            Coba lagi
          </button>
          <button type="button" className="btn-primary" onClick={() => location.reload()}>
            <RotateCcw size={13} /> Muat ulang halaman
          </button>
        </div>
      </div>
    );
  }
}
