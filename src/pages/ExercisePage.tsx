import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Loader2 } from 'lucide-react';
import { datasetRefs, exercisesByTrack, getContent, getExercise, packagesFor } from '../content/loader';
import type { TrackId } from '../content/types';
import { resetExerciseProgress } from '../db';
import { getSavedCode, saveCode, useAllProgress, useExerciseProgress, useProgressActions } from '../db/hooks';
import { copyText } from '../lib/format';
import { getPrefs, setPref, usePrefs } from '../lib/prefs';
import { navigate } from '../lib/router';
import { pythonRuntime, useRuntimeState } from '../runtime/pythonRuntime';
import { CodeMirrorEditor, type EditorHandle } from '../components/editor/CodeMirrorEditor';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { HintModal } from '../components/hint/HintModal';
import { InstructionPanel, type InstructionTab } from '../components/instructions/InstructionPanel';
import { ResizablePanels } from '../components/layout/ResizablePanels';
import { Sidebar } from '../components/layout/Sidebar';
import { useToast } from '../components/layout/Toast';
import { OutputPanel, type RunState } from '../components/output/OutputPanel';
import { SolutionModal } from '../components/solution/SolutionModal';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

const EMPTY_RUN: RunState = { running: false, checking: false, result: null, check: null, stdout: '', stderr: '', runKey: 0 };

export const ExercisePage: React.FC<{ exerciseId: string }> = ({ exerciseId }) => {
  const exercise = getExercise(exerciseId);
  if (!exercise) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-fg">Latihan “{exerciseId}” tidak ditemukan.</p>
        <button type="button" className="btn-primary" onClick={() => navigate({ name: 'home' })}>
          Kembali ke beranda
        </button>
      </div>
    );
  }
  return <Workspace key={exercise.track} initialId={exercise.id} routeId={exerciseId} />;
};

const Workspace: React.FC<{ initialId: string; routeId: string }> = ({ routeId }) => {
  const exercise = getExercise(routeId)!;
  const { showToast } = useToast();
  const prefs = usePrefs();
  const rt = useRuntimeState();
  const progress = useExerciseProgress(exercise.id);
  const progressMap = useAllProgress();
  const { recordAttempt, recordHint, recordSolutionViewed } = useProgressActions();
  const datasets = useMemo(() => datasetRefs(exercise), [exercise]);
  const sqlSchema = useMemo(() => {
    if (exercise.language !== 'sql') return undefined;
    const reg = getContent().datasets;
    return Object.fromEntries(exercise.frontmatter.datasets.map((d) => [d, (reg[d]?.columns || []).map((c) => c.name)]));
  }, [exercise]);

  const [code, setCode] = useState<string | null>(null);
  const [run, setRun] = useState<RunState>(EMPTY_RUN);
  const [tab, setTab] = useState<InstructionTab>('instruksi');
  const [hintOpen, setHintOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [mobileFocus, setMobileFocus] = useState<'instruksi' | 'kode' | 'hasil' | undefined>();
  const [prepMsg, setPrepMsg] = useState<string | null>(null);
  const editorRef = useRef<EditorHandle>(null);
  const runCache = useRef(new Map<string, RunState>());
  const exRef = useRef(exercise);
  exRef.current = exercise;
  const codeRef = useRef<string | null>(null);
  codeRef.current = code;

  // --- Ganti latihan: muat kode tersimpan (sekali), pulihkan hasil run terakhir di sesi ini
  useEffect(() => {
    let alive = true;
    setCode(null);
    setTab('instruksi');
    setRun(runCache.current.get(exercise.id) ?? EMPTY_RUN);
    setPref('lastTrack', exercise.track);
    setPref('lastExercise', { ...getPrefs().lastExercise, [exercise.track]: exercise.id });
    getSavedCode(exercise.id).then((saved) => {
      if (alive) setCode(saved ?? exercise.sections.starter);
    });
    return () => {
      alive = false;
    };
  }, [exercise.id]);

  // Simpan hasil run per latihan agar tidak hilang saat berpindah-pindah
  useEffect(() => {
    if (!run.running && !run.checking) runCache.current.set(exercise.id, run);
  }, [run, exercise.id]);

  // --- Simpan otomatis (debounce) — TIDAK memicu pemuatan ulang editor
  useEffect(() => {
    if (code === null) return;
    const t = setTimeout(() => {
      saveCode(exercise.id, code).then(() => setSavedAt(Date.now()));
    }, 700);
    return () => clearTimeout(t);
  }, [code, exercise.id]);

  // --- Siapkan runtime (paket + dataset) untuk latihan ini
  useEffect(() => {
    let alive = true;
    setPrepMsg('Menyiapkan latihan…');
    pythonRuntime
      .prepare(
        {
          key: exercise.id,
          language: exercise.language,
          packages: packagesFor(exercise),
          datasets,
          warmup: exercise.language === 'python' ? [exercise.sections.starter, exercise.sections.solusi, exercise.sections.checker] : [],
        },
        (m) => alive && setPrepMsg(m),
      )
      .then(() => alive && setPrepMsg(null))
      .catch((e) => {
        if (!alive) return;
        setPrepMsg(null);
        showToast(`Gagal menyiapkan latihan: ${(e as Error).message}`, 'error');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  // --- Streaming output: gabungkan per frame agar UI tetap ringan
  const streamBuf = useRef({ stdout: '', stderr: '' });
  const rafId = useRef<number | null>(null);
  const flushStream = useCallback(() => {
    rafId.current = null;
    const b = streamBuf.current;
    if (!b.stdout && !b.stderr) return;
    const add = { ...b };
    streamBuf.current = { stdout: '', stderr: '' };
    setRun((s) => ({ ...s, stdout: s.stdout + add.stdout, stderr: s.stderr + add.stderr }));
  }, []);

  const doRun = useCallback(async () => {
    const ex = exRef.current;
    const src = codeRef.current;
    if (src === null || pythonRuntime.isRunning()) return;
    setMobileFocus('hasil');
    setRun((s) => ({ ...s, running: true, checking: false, result: null, check: null, stdout: '', stderr: '' }));
    streamBuf.current = { stdout: '', stderr: '' };
    try {
      const result = await pythonRuntime.run(
        { language: ex.language, code: src, datasets: datasetRefs(ex), timeoutSec: ex.frontmatter.timeoutSec },
        {
          onStream: (kind, text) => {
            streamBuf.current[kind] += text;
            if (rafId.current === null) rafId.current = requestAnimationFrame(flushStream);
          },
        },
      );
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      if (exRef.current.id !== ex.id) return;
      setRun((s) => ({
        ...s,
        running: false,
        checking: result.ok,
        result,
        stdout: result.stdout ?? s.stdout,
        stderr: result.stderr ?? s.stderr,
        runKey: s.runKey + 1,
      }));
      if (!result.ok) {
        await recordAttempt(ex.id, false, null);
        return;
      }
      const check = await pythonRuntime.check({
        language: ex.language,
        checker: ex.sections.checker,
        solution: ex.sections.solusi,
        datasets: datasetRefs(ex),
      });
      if (exRef.current.id !== ex.id) return;
      setRun((s) => ({ ...s, checking: false, check }));
      const wasPassed = progressMap[ex.id]?.status === 'lulus';
      await recordAttempt(ex.id, check.passed, { passed: check.passedCount, total: check.totalCount });
      if (check.passed && !wasPassed) {
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          confetti({ particleCount: 70, spread: 65, origin: { y: 0.7 }, disableForReducedMotion: true });
        }
        showToast('Lulus! Pembahasan sekarang terbuka.', 'success');
      }
    } catch (e) {
      setRun((s) => ({ ...s, running: false, checking: false }));
      showToast(`Gagal menjalankan: ${(e as Error).message}`, 'error');
    }
  }, [flushStream, progressMap, recordAttempt, showToast]);

  const onReset = async () => {
    if (!window.confirm('Kembalikan kode ke kondisi awal? Kode yang sekarang akan hilang.')) return;
    setCode(exercise.sections.starter);
    setRun(EMPTY_RUN);
    runCache.current.delete(exercise.id);
    await resetExerciseProgress(exercise.id, exercise.sections.starter);
    showToast('Kode dikembalikan ke template awal.', 'info');
  };

  const list = exercisesByTrack(exercise.track);
  const idx = list.findIndex((e) => e.id === exercise.id);
  const next = list[idx + 1];
  const goto = (id: string) => navigate({ name: 'exercise', id });
  const onTrack = (t: TrackId) => {
    const last = getPrefs().lastExercise[t];
    const target = (last && getExercise(last)) || exercisesByTrack(t)[0];
    if (target) goto(target.id);
  };
  const pembahasanUnlocked = progress?.status === 'lulus' || Boolean(progress?.solutionViewed) || progress?.status === 'lihat-solusi';
  const runtimeReady = (rt.status === 'ready' || rt.status === 'busy') && !prepMsg;

  return (
    <>
      <ResizablePanels
        sidebarCollapsed={prefs.sidebarCollapsed}
        mobileFocus={mobileFocus}
        sidebar={
          <Sidebar
            track={exercise.track}
            currentId={exercise.id}
            progressMap={progressMap}
            onSelect={goto}
            onTrack={onTrack}
            collapsed={prefs.sidebarCollapsed}
            onToggle={() => setPref('sidebarCollapsed', !prefs.sidebarCollapsed)}
          />
        }
        instructions={
          <ErrorBoundary label="Instruksi">
            <InstructionPanel
              exercise={exercise}
              progress={progress}
              progressMap={progressMap}
              datasets={datasets}
              tab={tab}
              onTabChange={setTab}
              onOpenHint={() => setHintOpen(true)}
              onOpenSolution={() => setSolutionOpen(true)}
              pembahasanUnlocked={pembahasanUnlocked}
              onNavigate={goto}
            />
          </ErrorBoundary>
        }
        editor={
          <div className="flex h-full flex-col bg-panel">
            <EditorToolbar
              language={exercise.language}
              running={run.running}
              runtimeReady={runtimeReady}
              runtimeMessage={prepMsg || rt.message}
              savedAt={savedAt}
              onRun={doRun}
              onStop={() => pythonRuntime.stop('user')}
              onReset={onReset}
              copied={copied}
              onCopy={async () => {
                if (code !== null && (await copyText(code))) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                }
              }}
            />
            <div className="relative min-h-0 flex-1">
              {code === null ? (
                <div className="flex h-full items-center justify-center gap-2 text-xs text-fg3">
                  <Loader2 size={14} className="animate-spin" /> Memuat kode…
                </div>
              ) : (
                <CodeMirrorEditor
                  ref={editorRef}
                  value={code}
                  onChange={setCode}
                  language={exercise.language}
                  onRun={doRun}
                  onSave={() => showToast('Kode tersimpan otomatis di browser ini.', 'info')}
                  errorLine={run.result?.error?.line ?? null}
                  sqlSchema={sqlSchema}
                />
              )}
              {(rt.status === 'loading' || rt.status === 'error' || prepMsg) && (
                <div className="pointer-events-none absolute bottom-3 right-3 max-w-[280px] rounded-lg border border-line2 bg-panel2/95 px-3 py-2 text-2xs text-fg2 shadow-pop">
                  {rt.status === 'error' ? (
                    <span className="text-err">{rt.error}</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin text-accent" />
                      {rt.status === 'loading' ? `${rt.message}${rt.progress ? ` (${Math.round(rt.progress)}%)` : ''}` : prepMsg}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        }
        output={
          <ErrorBoundary label="Hasil">
            <OutputPanel
              state={run}
              language={exercise.language}
              onJumpToLine={(n) => {
                setMobileFocus('kode');
                editorRef.current?.jumpToLine(n);
              }}
              onRun={doRun}
              onNext={next ? () => goto(next.id) : undefined}
              hasNext={Boolean(next)}
              onShowPembahasan={exercise.sections.pembahasan ? () => setTab('pembahasan') : undefined}
            />
          </ErrorBoundary>
        }
      />
      <HintModal
        isOpen={hintOpen}
        onClose={() => setHintOpen(false)}
        hints={exercise.sections.hints}
        used={progress?.hintsUsed || 0}
        language={exercise.language}
        onUnlock={(lv) => recordHint(exercise.id, lv)}
      />
      <SolutionModal
        isOpen={solutionOpen}
        onClose={() => setSolutionOpen(false)}
        code={exercise.sections.solusi}
        language={exercise.language}
        alreadySeen={Boolean(progress?.solutionViewed) || progress?.status === 'lihat-solusi'}
        onConfirm={() => recordSolutionViewed(exercise.id)}
        onPaste={() => setCode(exercise.sections.solusi)}
      />
    </>
  );
};
