import { useSyncExternalStore } from 'react';

/**
 * Preferensi per-peserta (tema, ukuran huruf, posisi terakhir, dll.) disimpan di localStorage.
 * Semua akses dibungkus try/catch: di mode privat localStorage bisa tidak tersedia,
 * aplikasi tetap berjalan dengan nilai bawaan.
 */
export interface Prefs {
  theme: 'dark' | 'light';
  size: 'md' | 'lg' | 'xl';
  sidebarCollapsed: boolean;
  lastTrack: string;
  lastExercise: Record<string, string>;
  participantName: string;
  packageSource: 'auto' | 'lokal' | 'cdn';
  editorSplit: number;
  instructionWidth: number;
  sidebarWidth: number;
  seenWelcome: boolean;
}

export const DEFAULT_PREFS: Readonly<Prefs> = {
  theme: 'dark',
  size: 'md',
  sidebarCollapsed: false,
  lastTrack: 'analyst',
  lastExercise: {},
  participantName: '',
  packageSource: 'auto',
  editorSplit: 48,
  instructionWidth: 40,
  sidebarWidth: 264,
  seenWelcome: false,
};

const KEY = 'sbx-prefs-v2';
let state: Prefs = load();
const listeners = new Set<() => void>();

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* abaikan */
  }
  return { ...DEFAULT_PREFS };
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* abaikan */
  }
}

export function getPrefs(): Prefs {
  return state;
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  if (state[key] === value) return;
  state = { ...state, [key]: value };
  persist();
  applyDocumentPrefs();
  listeners.forEach((l) => l());
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function applyDocumentPrefs() {
  const root = document.documentElement;
  root.dataset.theme = state.theme;
  root.dataset.size = state.size;
}
