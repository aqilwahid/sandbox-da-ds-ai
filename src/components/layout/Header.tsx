import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  Wifi,
  WifiOff,
  Layers,
  Terminal,
  ChevronDown,
  Sparkles,
  Database,
  BrainCircuit,
  Wrench,
} from 'lucide-react';
import { TRACKS, type TrackId } from '../../content/types';
import { exportProgressToJson, importProgressFromJson } from '../../db/exportImport';
import { useToast } from './Toast';

interface HeaderProps {
  currentTrack: TrackId;
  onSelectTrack: (track: TrackId) => void;
  currentView: 'workspace' | 'preflight';
  onNavigateView: (view: 'workspace' | 'preflight') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTrack,
  onSelectTrack,
  currentView,
  onNavigateView,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [trackDropdownOpen, setTrackDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportProgressToJson();
      showToast('Cadangan progres berhasil diekspor ke file JSON.', 'success');
    } catch (err: any) {
      showToast(`Gagal mengekspor: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const res = await importProgressFromJson(text);
      showToast(`Berhasil mengimpor ${res.count} catatan progres latihan!`, 'success');
    } catch (err: any) {
      showToast(`Gagal mengimpor: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const activeTrackMeta = TRACKS[currentTrack];

  const getTrackIcon = (id: TrackId) => {
    switch (id) {
      case 'analyst':
        return <Database size={15} className="text-cyan-400" />;
      case 'datascience':
        return <BrainCircuit size={15} className="text-indigo-400" />;
      case 'ai':
        return <Sparkles size={15} className="text-emerald-400" />;
    }
  };

  return (
    <header className="h-14 bg-dark-950 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-30">
      {/* Brand & Track Switcher */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigateView('workspace')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Terminal size={17} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Hands-On Sandbox
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-brand-500/20 text-brand-300 rounded border border-brand-500/30">
                Offline WASM
              </span>
            </span>
          </div>
        </button>

        <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

        {/* Track Dropdown */}
        <div className="relative">
          <button
            onClick={() => setTrackDropdownOpen(!trackDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-slate-700/70 text-xs font-medium text-slate-200 transition-colors"
          >
            {getTrackIcon(currentTrack)}
            <span>{activeTrackMeta.name}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {trackDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-60 bg-dark-900 border border-slate-750 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-lg">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pilih Jalur Belajar (Track)
              </div>
              {(Object.keys(TRACKS) as TrackId[]).map((tKey) => {
                const track = TRACKS[tKey];
                const isSelected = tKey === currentTrack;
                return (
                  <button
                    key={tKey}
                    onClick={() => {
                      onSelectTrack(tKey);
                      setTrackDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                      isSelected
                        ? 'bg-brand-600/20 text-brand-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    {getTrackIcon(tKey)}
                    <div className="flex-1">
                      <div className="leading-tight">{track.name}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{track.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Offline indicator, Preflight, Export/Import */}
      <div className="flex items-center gap-2.5">
        {/* Network Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
            isOnline
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
          }`}
          title={isOnline ? 'Terhubung ke jaringan' : 'Bekerja 100% offline'}
        >
          {isOnline ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-amber-400" />}
          <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
        </div>

        {/* Preflight Button */}
        <button
          onClick={() => onNavigateView(currentView === 'workspace' ? 'preflight' : 'workspace')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            currentView === 'preflight'
              ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-500/30'
              : 'bg-dark-850 hover:bg-dark-800 text-slate-300 border-slate-700/80'
          }`}
          title="Buka status diagnostik & prewarm offline cache"
        >
          <Wrench size={13} className="text-cyan-400" />
          <span className="hidden md:inline">Preflight Check</span>
        </button>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-300 border border-slate-700/80 text-xs font-medium transition-colors"
          title="Ekspor progres ke file JSON"
        >
          <Download size={13} className="text-indigo-400" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Import Button */}
        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-300 border border-slate-700/80 text-xs font-medium cursor-pointer transition-colors">
          <Upload size={13} className="text-cyan-400" />
          <span className="hidden sm:inline">Import</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            disabled={isImporting}
            className="hidden"
          />
        </label>
      </div>
    </header>
  );
};
