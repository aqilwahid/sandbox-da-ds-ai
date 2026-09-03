import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Register PWA service worker for full offline precache
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('Versi baru tersedia.');
      },
      onOfflineReady() {
        console.log('Aplikasi siap bekerja 100% offline.');
      },
    });
  }).catch((err) => {
    console.warn('PWA registration info:', err);
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
