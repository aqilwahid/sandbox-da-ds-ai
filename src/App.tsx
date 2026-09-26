import React, { Suspense, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { getContent, getExercise, exercisesByTrack } from './content/loader';
import { TRACK_IDS, type TrackId } from './content/types';
import { navigate, useRoute } from './lib/router';
import { pythonRuntime } from './runtime/pythonRuntime';
import { Header } from './components/layout/Header';
import { ToastProvider } from './components/layout/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { APP } from './config';

// Halaman berat (editor, visual, grafik) dimuat terpisah agar beranda cepat terbuka.
const loadExercisePage = () => import('./pages/ExercisePage');
const ExercisePage = React.lazy(() => loadExercisePage().then((m) => ({ default: m.ExercisePage })));
const ProgressPage = React.lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const PreflightPage = React.lazy(() => import('./pages/PreflightPage').then((m) => ({ default: m.PreflightPage })));

const PageLoading: React.FC = () => (
  <div className="flex flex-1 items-center justify-center gap-2 text-sm text-fg3">
    <Loader2 size={16} className="animate-spin" /> Memuat…
  </div>
);

export const App: React.FC = () => {
  const route = useRoute();
  const content = getContent();

  // Siapkan Python di latar belakang sesaat setelah aplikasi terbuka
  useEffect(() => {
    const t = setTimeout(() => {
      pythonRuntime.ensureReady().catch(() => {});
      loadExercisePage().catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  // #/track/<id> → latihan pertama track tersebut
  useEffect(() => {
    if (route.name === 'track') {
      const t = (TRACK_IDS.includes(route.track as TrackId) ? route.track : 'analyst') as TrackId;
      const first = exercisesByTrack(t)[0];
      if (first) navigate({ name: 'exercise', id: first.id });
    }
  }, [route]);

  useEffect(() => {
    const title =
      route.name === 'exercise' ? getExercise(route.id)?.frontmatter.title : route.name === 'progress' ? 'Progres' : route.name === 'preflight' ? 'Cek kesiapan' : null;
    document.title = title ? `${title} · ${APP.name}` : APP.name;
  }, [route]);

  return (
    <ToastProvider>
      <div className="flex h-full flex-col overflow-hidden bg-bg text-fg">
        <Header route={route} />
        {content.errors.length > 0 && (
          <div className="flex items-start gap-2 border-b border-warn/40 bg-warn/10 px-4 py-2 text-2xs text-fg">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warn" />
            <span>
              <strong>{content.errors.length} masalah pada konten latihan</strong> (latihan lain tetap bisa dipakai). Jalankan{' '}
              <code className="font-mono">npm run validate:content</code> untuk detail. Contoh: {content.errors[0]}
            </span>
          </div>
        )}
        <ErrorBoundary label="Halaman">
          <main className="flex min-h-0 flex-1 flex-col">
            <Suspense fallback={<PageLoading />}>
              {route.name === 'home' && <HomePage />}
              {route.name === 'exercise' && <ExercisePage exerciseId={route.id} />}
              {route.name === 'progress' && <ProgressPage />}
              {route.name === 'preflight' && <PreflightPage />}
            </Suspense>
          </main>
        </ErrorBoundary>
      </div>
    </ToastProvider>
  );
};

export default App;
