import React, { useState, useMemo } from 'react';
import type { TrackId } from './content/types';
import { loadAllExercises } from './content/loader';
import { Header } from './components/layout/Header';
import { ExercisePage } from './pages/ExercisePage';
import { PreflightPage } from './pages/PreflightPage';
import { ToastProvider } from './components/layout/Toast';

export const App: React.FC = () => {
  const [currentTrack, setCurrentTrack] = useState<TrackId>('analyst');
  const [currentView, setCurrentView] = useState<'workspace' | 'preflight'>('workspace');

  const allExercises = useMemo(() => {
    return loadAllExercises();
  }, []);

  return (
    <ToastProvider>
      <div className="h-screen w-screen flex flex-col bg-dark-900 text-slate-100 overflow-hidden font-sans">
        {/* Header */}
        <Header
          currentTrack={currentTrack}
          onSelectTrack={setCurrentTrack}
          currentView={currentView}
          onNavigateView={setCurrentView}
        />

        {/* View Switch */}
        {currentView === 'workspace' ? (
          <ExercisePage
            currentTrack={currentTrack}
            allExercises={allExercises}
          />
        ) : (
          <PreflightPage
            onBackToWorkspace={() => setCurrentView('workspace')}
          />
        )}
      </div>
    </ToastProvider>
  );
};

export default App;
