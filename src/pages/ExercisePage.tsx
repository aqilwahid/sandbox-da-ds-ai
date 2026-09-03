import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import type { Exercise, TrackId } from '../content/types';
import { getExercisesByTrack, getNextExercise } from '../content/loader';
import { getRuntimeAdapter } from '../runtime/adapters/registry';
import type { CheckResult, RunResult, RuntimeAdapter } from '../runtime/types';
import { useAllProgress, useDebouncedCodePersistence, useExerciseProgress, useProgressActions } from '../db/hooks';
import { resetExerciseProgress } from '../db';
import { Sidebar } from '../components/layout/Sidebar';
import { InstructionPanel } from '../components/instructions/InstructionPanel';
import { CodeMirrorEditor } from '../components/editor/CodeMirrorEditor';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { OutputPanel } from '../components/output/OutputPanel';
import { ResizablePanels } from '../components/layout/ResizablePanels';
import { HintModal } from '../components/hint/HintModal';
import { SolutionModal } from '../components/solution/SolutionModal';
import { ProgressBar } from '../components/common/ProgressBar';
import { useToast } from '../components/layout/Toast';

interface ExercisePageProps {
  currentTrack: TrackId;
  allExercises: Exercise[];
}

export const ExercisePage: React.FC<ExercisePageProps> = ({ currentTrack, allExercises }) => {
  const trackExercises = getExercisesByTrack(currentTrack);
  const [currentExerciseId, setCurrentExerciseId] = useState<string>(
    trackExercises[0]?.id || allExercises[0]?.id || ''
  );

  const activeExercise = allExercises.find((ex) => ex.id === currentExerciseId) || allExercises[0];

  // Dexie Progress hooks
  const progressMap = useAllProgress();
  const currentProgress = useExerciseProgress(activeExercise?.id || '');
  const { updateStatus } = useProgressActions();
  const { showToast } = useToast();

  // Local state for editor & execution
  const [code, setCode] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [streamingStdout, setStreamingStdout] = useState('');
  const [streamingStderr, setStreamingStderr] = useState('');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  // Runtime loading state
  const [runtimeProgress, setRuntimeProgress] = useState<{ pct: number; msg: string } | null>(null);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const runtimeRef = useRef<RuntimeAdapter | null>(null);

  // Modals
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [solutionModalOpen, setSolutionModalOpen] = useState(false);

  // Switch exercise when track changes if active exercise not in track
  useEffect(() => {
    if (activeExercise && activeExercise.track !== currentTrack) {
      const firstInTrack = trackExercises[0];
      if (firstInTrack) {
        setCurrentExerciseId(firstInTrack.id);
      }
    }
  }, [currentTrack, activeExercise, trackExercises]);

  // Load saved code from Dexie or fallback to starter template
  useEffect(() => {
    if (!activeExercise) return;

    if (currentProgress && typeof currentProgress.code === 'string') {
      setCode(currentProgress.code);
    } else {
      setCode(activeExercise.sections.starter);
    }

    // Reset results when switching exercise
    setRunResult(null);
    setCheckResult(null);
    setStreamingStdout('');
    setStreamingStderr('');
  }, [activeExercise?.id, currentProgress?.updatedAt]);

  // Debounced auto-save to Dexie (1 second)
  useDebouncedCodePersistence(activeExercise?.id || '', code, 1000);

  // Initialize Runtime Adapter and preload packages BEFORE allowing execution
  useEffect(() => {
    if (!activeExercise) return;

    let isMounted = true;
    const lang = activeExercise.frontmatter.runtime === 'duckdb' ? 'sql' : 'python';
    const adapter = getRuntimeAdapter(activeExercise.frontmatter.runtime, lang);
    runtimeRef.current = adapter;

    const initRuntime = async () => {
      setRuntimeReady(false);
      setRuntimeProgress({ pct: 5, msg: `Menyiapkan runtime ${activeExercise.frontmatter.runtime}...` });

      try {
        await adapter.init({
          onProgress: (pct, msg) => {
            if (isMounted) {
              setRuntimeProgress({ pct, msg });
            }
          },
        });

        // Preload packages specified in frontmatter
        if (activeExercise.frontmatter.packages.length > 0) {
          await adapter.preload(activeExercise.frontmatter.packages);
        }

        if (isMounted) {
          setRuntimeReady(true);
          setRuntimeProgress(null);
        }
      } catch (err: any) {
        if (isMounted) {
          showToast(`Gagal memuat runtime: ${err.message}`, 'error');
          setRuntimeProgress(null);
        }
      }
    };

    initRuntime();

    return () => {
      isMounted = false;
    };
  }, [activeExercise?.id, activeExercise?.frontmatter.runtime, activeExercise?.frontmatter.packages]);

  // Run and evaluate code
  const handleRun = useCallback(async () => {
    if (!activeExercise || !runtimeRef.current || isRunning) return;

    setIsRunning(true);
    setStreamingStdout('');
    setStreamingStderr('');
    setRunResult(null);
    setCheckResult(null);

    try {
      const adapter = runtimeRef.current;

      // 1. Execute user code with real-time streaming
      const result = await adapter.run(code, 7000, (stream, text) => {
        if (stream === 'stderr') {
          setStreamingStderr((prev) => prev + text);
        } else {
          setStreamingStdout((prev) => prev + text);
        }
      });
      setRunResult(result);

      if (result.error) {
        showToast(result.error, 'error');
      }

      // 2. Run automated checker
      const check = await adapter.runChecker(activeExercise.sections.checker, code);
      setCheckResult(check);

      // 3. Update persistent progress in Dexie
      const isPassed = check.passed;
      const newStatus = isPassed
        ? 'lulus'
        : currentProgress?.status === 'lihat-solusi'
        ? 'lihat-solusi'
        : 'dicoba';

      await updateStatus(activeExercise.id, newStatus, {
        isPassed,
        incrementAttempt: true,
      });

      if (isPassed) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        showToast('Luar biasa! Anda berhasil menyelesaikan latihan ini.', 'success');
      }
    } catch (err: any) {
      showToast(`Error eksekusi: ${err.message}`, 'error');
    } finally {
      setIsRunning(false);
    }
  }, [activeExercise, code, isRunning, currentProgress, updateStatus, showToast]);

  // Reset code to starter template
  const handleReset = async () => {
    if (!activeExercise) return;
    const confirmReset = window.confirm(
      'Apakah Anda yakin ingin mengembalikan kode ke kondisi awal (starter code)?'
    );
    if (!confirmReset) return;

    setCode(activeExercise.sections.starter);
    setRunResult(null);
    setCheckResult(null);
    setStreamingStdout('');
    setStreamingStderr('');
    await resetExerciseProgress(activeExercise.id, activeExercise.sections.starter);

    if (runtimeRef.current) {
      await runtimeRef.current.reset();
    }
    showToast('Kode berhasil di-reset ke template awal.', 'info');
  };

  const handleUseHint = async (_level: number) => {
    if (!activeExercise) return;
    await updateStatus(activeExercise.id, currentProgress?.status || 'dicoba', {
      incrementHint: true,
    });
  };

  const handleConfirmViewSolution = async () => {
    if (!activeExercise) return;
    await updateStatus(activeExercise.id, 'lihat-solusi');
    showToast('Kunci solusi dibuka. Status latihan diperbarui.', 'info');
  };

  const nextExercise = getNextExercise(activeExercise?.id || '');

  const handleNextExercise = () => {
    if (nextExercise) {
      setCurrentExerciseId(nextExercise.id);
    }
  };

  if (!activeExercise) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Memuat latihan...
      </div>
    );
  }

  const editorLang = activeExercise.frontmatter.runtime === 'duckdb' ? 'sql' : 'python';

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Honest Runtime Loading Overlay */}
      {runtimeProgress && (
        <div className="absolute top-3 right-3 z-40 w-80 animate-slide-down">
          <ProgressBar
            percentage={runtimeProgress.pct}
            message={runtimeProgress.msg}
          />
        </div>
      )}

      {/* 3-Panel Resizable Workspace */}
      <ResizablePanels
        sidebar={
          <Sidebar
            exercises={allExercises}
            currentExerciseId={currentExerciseId}
            onSelectExercise={(id) => setCurrentExerciseId(id)}
            currentTrack={currentTrack}
            progressMap={progressMap}
          />
        }
        instructions={
          <InstructionPanel
            exercise={activeExercise}
            progress={currentProgress}
            allExercises={allExercises}
            progressMap={progressMap}
            onOpenHint={() => setHintModalOpen(true)}
            onOpenSolution={() => setSolutionModalOpen(true)}
          />
        }
        editor={
          <div className="h-full flex flex-col bg-dark-950 overflow-hidden">
            <EditorToolbar
              language={editorLang}
              isRunning={isRunning}
              onRun={handleRun}
              onReset={handleReset}
              onOpenHint={() => setHintModalOpen(true)}
              onOpenSolution={() => setSolutionModalOpen(true)}
              hintCount={activeExercise.sections.hints?.length || 0}
              hintsUsed={currentProgress?.hintsUsed || 0}
              runtimeReady={runtimeReady}
            />
            <div className="flex-1 overflow-hidden">
              <CodeMirrorEditor
                value={code}
                onChange={setCode}
                language={editorLang}
                onRun={handleRun}
              />
            </div>
          </div>
        }
        output={
          <OutputPanel
            runResult={runResult}
            streamingStdout={streamingStdout}
            streamingStderr={streamingStderr}
            checkResult={checkResult}
            isRunning={isRunning}
            onNextExercise={handleNextExercise}
            hasNextExercise={Boolean(nextExercise)}
          />
        }
      />

      {/* Hint Modal */}
      <HintModal
        isOpen={hintModalOpen}
        onClose={() => setHintModalOpen(false)}
        hints={activeExercise.sections.hints || []}
        initialHintsUsed={currentProgress?.hintsUsed || 1}
        onUseHint={handleUseHint}
      />

      {/* Solution Modal */}
      <SolutionModal
        isOpen={solutionModalOpen}
        onClose={() => setSolutionModalOpen(false)}
        solutionCode={activeExercise.sections.solusi}
        hasAlreadySeenSolution={currentProgress?.status === 'lihat-solusi'}
        onConfirmViewSolution={handleConfirmViewSolution}
      />
    </div>
  );
};
