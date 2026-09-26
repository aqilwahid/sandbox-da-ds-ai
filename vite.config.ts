import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pyodideVersion: string = JSON.parse(readFileSync(new URL('./node_modules/pyodide/package.json', import.meta.url), 'utf-8')).version;
const appVersion: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version;

// Cross-origin isolation → tombol Stop bisa menghentikan Python tanpa memuat ulang runtime.
// Jika hosting tidak mengirim header ini (mis. GitHub Pages), aplikasi tetap jalan (fallback: restart worker).
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.BASE_PATH || '/';
  return {
    base,
    define: {
      __PYODIDE_VERSION__: JSON.stringify(pyodideVersion),
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        manifest: {
          name: env.VITE_APP_NAME || 'Sandbox Data & AI',
          short_name: 'Sandbox DA·DS·AI',
          description: 'Latihan hands-on Data Analyst, Data Science, dan AI Engineering langsung di browser.',
          lang: 'id',
          theme_color: '#0b0f16',
          background_color: '#0b0f16',
          display: 'standalone',
          start_url: '.',
          icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
        },
        workbox: {
          // Aplikasi + inti Python (wasm/stdlib) + dataset di-precache agar bisa offline.
          globPatterns: ['**/*.{js,css,html,svg,woff2,csv}', 'pyodide/*.{mjs,wasm,zip,json}'],
          globIgnores: ['**/*-tests.zip', 'pyodide/*.whl'],
          maximumFileSizeToCacheInBytes: 24 * 1024 * 1024,
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Paket Python dari CDN jsDelivr — disimpan setelah unduhan pertama
              urlPattern: ({ url }) => url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/pyodide/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'pyodide-cdn',
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 180 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // Paket Python lokal (setelah `npm run setup:offline`)
              urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/pyodide\/[^/]+\.(whl|zip)$/.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'pyodide-local',
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 180 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    optimizeDeps: { exclude: ['pyodide'] },
    worker: { format: 'es' },
    server: { port: 3000, headers: isolationHeaders },
    preview: { port: 4173, headers: isolationHeaders },
    build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  };
});
