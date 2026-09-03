import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef } from 'react';
import { db, saveProgress, type ExerciseProgressRecord } from './index';

export function useExerciseProgress(exerciseId: string): ExerciseProgressRecord | undefined {
  return useLiveQuery(() => db.progress.get(exerciseId), [exerciseId]);
}

export function useAllProgress(): Record<string, ExerciseProgressRecord> {
  const list = useLiveQuery(() => db.progress.toArray(), []);
  const map: Record<string, ExerciseProgressRecord> = {};
  if (list) {
    list.forEach((item) => {
      map[item.exerciseId] = item;
    });
  }
  return map;
}

export function useDebouncedCodePersistence(
  exerciseId: string,
  code: string,
  delayMs = 1000
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!exerciseId) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      const existing = await db.progress.get(exerciseId);
      if (existing) {
        if (existing.code !== code) {
          await saveProgress({
            exerciseId,
            code,
            status: existing.status === 'belum' ? 'dicoba' : existing.status,
          });
        }
      } else {
        await saveProgress({
          exerciseId,
          code,
          status: 'dicoba',
        });
      }
    }, delayMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [exerciseId, code, delayMs]);
}

export function useProgressActions() {
  const updateStatus = useCallback(
    async (
      exerciseId: string,
      status: ExerciseProgressRecord['status'],
      opts?: { isPassed?: boolean; incrementAttempt?: boolean; incrementHint?: boolean }
    ) => {
      const existing = await db.progress.get(exerciseId);
      const attemptsCount = (existing?.attemptsCount || 0) + (opts?.incrementAttempt ? 1 : 0);
      const hintsUsed = (existing?.hintsUsed || 0) + (opts?.incrementHint ? 1 : 0);
      const passedAt = opts?.isPassed ? Date.now() : existing?.passedAt;

      await saveProgress({
        exerciseId,
        status,
        attemptsCount,
        hintsUsed,
        passedAt,
      });
    },
    []
  );

  return { updateStatus };
}
