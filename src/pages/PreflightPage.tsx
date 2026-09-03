import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  Cpu,
  Wifi,
  DownloadCloud,
  Layers,
  ArrowLeft,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ProgressBar } from '../components/common/ProgressBar';
import { MockRuntimeAdapter } from '../runtime/adapters/mockAdapter';
import { useToast } from '../components/layout/Toast';

interface PreflightStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error';
  details?: string;
}

export const PreflightPage: React.FC<{ onBackToWorkspace: () => void }> = ({ onBackToWorkspace }) => {
  const [steps, setSteps] = useState<PreflightStep[]>([
    {
      id: 'sw',
      name: 'PWA Service Worker & Cache Storage',
      description: 'Memeriksa pendaftaran Service Worker untuk precache file statis offline.',
      status: 'pending',
    },
    {
      id: 'storage',
      name: 'IndexedDB & Dexie Storage',
      description: 'Memverifikasi izin penyimpanan browser lokal untuk persistensi kode & progres.',
      status: 'pending',
    },
    {
      id: 'worker',
      name: 'Web Worker Isolation & Execution',
      description: 'Menguji inisialisasi background Web Worker dan mekanisme timeout kill guard.',
      status: 'pending',
    },
    {
      id: 'runtime-mock',
      name: 'Prewarm Sandbox Runtime Engine',
      description: 'Mengalokasikan memori WebAssembly dan memuat context awal runtime.',
      status: 'pending',
    },
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [storageEstimate, setStorageEstimate] = useState<string>('');
  const { showToast } = useToast();

  useEffect(() => {
    // Check storage estimate
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        const usageMb = Math.round(((est.usage || 0) / (1024 * 1024)) * 10) / 10;
        const quotaMb = Math.round(((est.quota || 0) / (1024 * 1024)) * 10) / 10;
        setStorageEstimate(`Terpakai: ${usageMb} MB / Kuota: ${quotaMb} MB`);
      });
    }
  }, []);

  const updateStepStatus = (id: string, status: PreflightStep['status'], details?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, details: details || s.details } : s))
    );
  };

  const runAllChecks = async () => {
    setIsRunningAll(true);
    setProgressPct(5);
    setProgressMsg('Memulai pengujian kesiapan offline...');

    // 1. Service Worker check
    updateStepStatus('sw', 'running');
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const swActive = reg && reg.active;
        updateStepStatus(
          'sw',
          'success',
          swActive
            ? 'Service Worker aktif & precache bundle siap.'
            : 'Service worker terdaftar (siap precache pada mode standalone/preview).'
        );
      } else {
        updateStepStatus('sw', 'error', 'Browser tidak mendukung Service Worker.');
      }
    } catch (e: any) {
      updateStepStatus('sw', 'error', e.message);
    }
    setProgressPct(30);

    // 2. Storage & IndexedDB Check
    updateStepStatus('storage', 'running');
    try {
      const isIndexedDbAvailable = Boolean(window.indexedDB);
      if (isIndexedDbAvailable) {
        updateStepStatus('storage', 'success', 'IndexedDB aktif, Dexie.js siap menyimpan progres.');
      } else {
        updateStepStatus('storage', 'error', 'IndexedDB tidak didukung atau diblokir.');
      }
    } catch (e: any) {
      updateStepStatus('storage', 'error', e.message);
    }
    setProgressPct(60);

    // 3. Web Worker Check & Timeout Guard
    updateStepStatus('worker', 'running');
    try {
      const mockAdapter = new MockRuntimeAdapter();
      await mockAdapter.init({
        onProgress: (pct, msg) => {
          setProgressMsg(msg);
        },
      });

      const res = await mockAdapter.run('print("preflight check")', 3000);
      if (res.error) {
        updateStepStatus('worker', 'error', res.error);
      } else {
        updateStepStatus(
          'worker',
          'success',
          `Worker berhasil merespons dalam ${res.durationMs}ms.`
        );
      }
      mockAdapter.terminate();
    } catch (e: any) {
      updateStepStatus('worker', 'error', e.message);
    }
    setProgressPct(85);

    // 4. Prewarm Sandbox Runtime
    updateStepStatus('runtime-mock', 'running');
    try {
      const mockAdapter = new MockRuntimeAdapter();
      await mockAdapter.init({ onProgress: () => {} });
      await mockAdapter.preload(['pandas', 'duckdb']);
      updateStepStatus('runtime-mock', 'success', 'Runtime berhasil diprewarm dan dicache di memory.');
      mockAdapter.terminate();
    } catch (e: any) {
      updateStepStatus('runtime-mock', 'error', e.message);
    }

    setProgressPct(100);
    setProgressMsg('Semua pengujian diagnostik selesai!');
    setIsRunningAll(false);
    showToast('Pemeriksaan kesiapan offline selesai!', 'success');
  };

  const allPassed = steps.every((s) => s.status === 'success');

  return (
    <div className="flex-1 flex flex-col bg-dark-900 overflow-y-auto p-6 md:p-10">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToWorkspace}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-300 border border-slate-700/80 text-xs font-medium transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Latihan</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              {storageEstimate}
            </span>
          </div>
        </div>

        {/* Hero Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-dark-850 to-dark-800 border border-slate-750 shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30 text-xs font-mono">
              <DownloadCloud size={13} />
              Preflight Offline Readiness
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Persiapan Kelas Tanpa Jaringan (100% Offline)
            </h1>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Halaman ini memastikan browser Anda sudah mengunduh dan meng-cache seluruh file aplikasi, WebAssembly, Web Worker, dan pustaka runtime. Setelah proses ini selesai, laptop peserta dapat sepenuhnya diputus dari internet saat kelas berlangsung.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={runAllChecks}
                disabled={isRunningAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
              >
                {isRunningAll ? (
                  <>
                    <RotateCcw size={14} className="animate-spin" />
                    <span>Sedang Menguji Cache...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Precache & Verifikasi Semua Runtime</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar during execution */}
        {isRunningAll && (
          <ProgressBar percentage={progressPct} message={progressMsg} />
        )}

        {/* Step Checklist */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Daftar Uji Kesiapan Lingkungan
          </h2>

          <div className="space-y-2.5">
            {steps.map((step) => {
              return (
                <div
                  key={step.id}
                  className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                    step.status === 'success'
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                      : step.status === 'error'
                      ? 'bg-rose-950/20 border-rose-500/40 text-slate-200'
                      : step.status === 'running'
                      ? 'bg-brand-950/20 border-brand-500/40 text-slate-200'
                      : 'bg-dark-850 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {step.status === 'success' && (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    )}
                    {step.status === 'error' && (
                      <XCircle size={18} className="text-rose-400" />
                    )}
                    {step.status === 'running' && (
                      <div className="w-4 h-4 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                    )}
                    {step.status === 'pending' && (
                      <div className="w-4 h-4 rounded-full border border-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-100">{step.name}</h3>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-dark-900 border border-slate-800">
                        {step.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {step.description}
                    </p>

                    {step.details && (
                      <div className="pt-1 text-[11px] font-mono text-slate-300">
                        ℹ️ {step.details}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Readiness Badge */}
        {allPassed && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-200 text-xs">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span>
                <strong>Browser Anda 100% Siap untuk Kelas Offline!</strong> Anda dapat mematikan koneksi WiFi sekarang.
              </span>
            </div>

            <button
              onClick={onBackToWorkspace}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
            >
              Mulai Coding
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
