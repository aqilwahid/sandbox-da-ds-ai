import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo } from 'react';
import { db, saveProgress, type ExerciseProgressRecord, type ExerciseStatus } from './index';

export function useExerciseProgress(exerciseId: string): ExerciseProgressRecord | undefined {
  return useLiveQuery(() => (exerciseId ? db.progress.get(exerciseId) : undefined), [exerciseId]);
}

export function useAllProgress(): Record<string, ExerciseProgressRecord> {
  const list = useLiveQuery(() => db.progress.toArray().catch(() => []), []);
  return useMemo(() => {
    const map: Record<string, ExerciseProgressRecord> = {};
    (list || []).forEach((r) => (map[r.exerciseId] = r));
    return map;
  }, [list]);
}

export async function getSavedCode(exerciseId: string): Promise<string | undefined> {
  try {
    const r = await db.progress.get(exerciseId);
    return typeof r?.code === 'string' && r.code.length ? r.code : undefined;
  } catch {
    return undefined;
  }
}

export async function saveCode(exerciseId: string, code: string) {
  try {
    const existing = await db.progress.get(exerciseId);
    if (existing && existing.code === code) return;
    await saveProgress({
      exerciseId,
      code,
      status: existing ? (existing.status === 'belum' ? 'dicoba' : existing.status) : 'dicoba',
    });
  } catch {
    /* abaikan */
  }
}

export function useProgressActions() {
  const recordAttempt = useCallback(
    async (exerciseId: string, passed: boolean, score: { passed: number; total: number } | null) => {
      const existing = await db.progress.get(exerciseId).catch(() => undefined);
      let status: ExerciseStatus = passed ? 'lulus' : existing?.status === 'lulus' ? 'lulus' : existing?.status === 'lihat-solusi' ? 'lihat-solusi' : 'dicoba';
      if (existing?.status === 'lulus') status = 'lulus';
      await saveProgress({
        exerciseId,
        status,
        attemptsCount: (existing?.attemptsCount || 0) + 1,
        lastScore: score ?? existing?.lastScore,
        passedAt: passed ? existing?.passedAt ?? Date.now() : existing?.passedAt,
      });
    },
    [],
  );

  const recordHint = useCallback(async (exerciseId: string, level: number) => {
    const existing = await db.progress.get(exerciseId).catch(() => undefined);
    if ((existing?.hintsUsed || 0) >= level) return;
    await saveProgress({ exerciseId, hintsUsed: level, status: existing?.status ?? 'dicoba' });
  }, []);

  const recordSolutionViewed = useCallback(async (exerciseId: string) => {
    const existing = await db.progress.get(exerciseId).catch(() => undefined);
    await saveProgress({
      exerciseId,
      solutionViewed: true,
      status: existing?.status === 'lulus' ? 'lulus' : 'lihat-solusi',
    });
  }, []);

  return { recordAttempt, recordHint, recordSolutionViewed };
}
