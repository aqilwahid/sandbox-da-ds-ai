/**
 * Konfigurasi aplikasi. Nama & penyelenggara bisa diganti tanpa mengubah kode
 * lewat file `.env` (lihat `.env.example`):
 *
 *   VITE_APP_NAME="Sandbox Data & AI"
 *   VITE_ORG_NAME="Nama Lembaga Pelatihan"
 *   VITE_TRAINING_TITLE="Pelatihan Data Analyst Batch 12"
 */
declare const __PYODIDE_VERSION__: string;
declare const __APP_VERSION__: string;

export const APP = {
  name: (import.meta.env.VITE_APP_NAME as string) || 'Sandbox Data & AI',
  organization: (import.meta.env.VITE_ORG_NAME as string) || '',
  trainingTitle: (import.meta.env.VITE_TRAINING_TITLE as string) || '',
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
};

export const PYODIDE_VERSION: string =
  typeof __PYODIDE_VERSION__ !== 'undefined' ? __PYODIDE_VERSION__ : '314.0.6';

/** Base path aplikasi (mis. "/" atau "/sandbox-da-ds-ai/" untuk GitHub Pages). */
export const BASE_URL: string = import.meta.env.BASE_URL || '/';

export function absoluteUrl(path: string): string {
  const clean = path.replace(/^\//, '');
  return new URL(BASE_URL + clean, self.location.origin).href;
}

/** Lokasi paket Python (wheel) di CDN resmi Pyodide. */
export const CDN_PACKAGE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/** Paket yang disiapkan saat "Cek Kesiapan" (preflight) agar kelas bisa berjalan offline. */
export const PRELOAD_PACKAGES = ['duckdb', 'pandas', 'matplotlib', 'scikit-learn'];
