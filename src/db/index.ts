import Dexie, { type Table } from 'dexie';

export type ExerciseStatus = 'belum' | 'dicoba' | 'lulus' | 'lihat-solusi';

export interface ExerciseProgressRecord {
  exerciseId: string;
  code: string;
  status: ExerciseStatus;
  attemptsCount: number;
  hintsUsed: number;
  solutionViewed?: boolean;
  lastScore?: { passed: number; total: number };
  passedAt?: number;
  updatedAt: number;
}

export class TrainingPlatformDB extends Dexie {
  progress!: Table<ExerciseProgressRecord, string>;

  constructor() {
    super('TrainingPlatformDB');
    this.version(1).stores({ progress: 'exerciseId, status, updatedAt' });
    this.version(2)
      .stores({ progress: 'exerciseId, status, updatedAt' })
      .upgrade((tx) =>
        tx
          .table('progress')
          .toCollection()
          .modify((r: ExerciseProgressRecord) => {
            if (r.status === 'lihat-solusi') r.solutionViewed = true;
          }),
      );
  }
}

export const db = new TrainingPlatformDB();

export async function saveProgress(
  record: Partial<ExerciseProgressRecord> & { exerciseId: string },
): Promise<void> {
  const now = Date.now();
  try {
    await db.transaction('rw', db.progress, async () => {
      const existing = await db.progress.get(record.exerciseId);
      if (existing) {
        await db.progress.update(record.exerciseId, { ...record, updatedAt: now });
      } else {
        await db.progress.add({
          exerciseId: record.exerciseId,
          code: record.code ?? '',
          status: record.status ?? 'belum',
          attemptsCount: record.attemptsCount ?? 0,
          hintsUsed: record.hintsUsed ?? 0,
          solutionViewed: record.solutionViewed ?? false,
          lastScore: record.lastScore,
          passedAt: record.passedAt,
          updatedAt: now,
        });
      }
    });
  } catch (e) {
    // IndexedDB bisa diblokir (mode privat tertentu) — aplikasi tetap jalan tanpa menyimpan
    console.warn('Gagal menyimpan progres', e);
  }
}

export async function resetExerciseProgress(exerciseId: string, starterCode: string): Promise<void> {
  try {
    await db.progress.put({
      exerciseId,
      code: starterCode,
      status: 'belum',
      attemptsCount: 0,
      hintsUsed: 0,
      solutionViewed: false,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn('Gagal mereset progres', e);
  }
}

export async function resetAllProgress(): Promise<void> {
  await db.progress.clear();
}
