import Dexie, { type Table } from 'dexie';

export type ExerciseStatus = 'belum' | 'dicoba' | 'lulus' | 'lihat-solusi';

export interface ExerciseProgressRecord {
  exerciseId: string;
  code: string;
  status: ExerciseStatus;
  attemptsCount: number;
  hintsUsed: number;
  passedAt?: number;
  updatedAt: number;
}

export class TrainingPlatformDB extends Dexie {
  progress!: Table<ExerciseProgressRecord, string>;

  constructor() {
    super('TrainingPlatformDB');
    this.version(1).stores({
      progress: 'exerciseId, status, updatedAt',
    });
  }
}

export const db = new TrainingPlatformDB();

export async function getProgress(exerciseId: string): Promise<ExerciseProgressRecord | undefined> {
  return await db.progress.get(exerciseId);
}

export async function saveProgress(record: Partial<ExerciseProgressRecord> & { exerciseId: string }): Promise<void> {
  const existing = await db.progress.get(record.exerciseId);
  const now = Date.now();

  if (existing) {
    await db.progress.update(record.exerciseId, {
      ...record,
      updatedAt: now,
    });
  } else {
    await db.progress.add({
      exerciseId: record.exerciseId,
      code: record.code || '',
      status: record.status || 'belum',
      attemptsCount: record.attemptsCount || 0,
      hintsUsed: record.hintsUsed || 0,
      passedAt: record.passedAt,
      updatedAt: now,
    });
  }
}

export async function resetExerciseProgress(exerciseId: string, starterCode: string): Promise<void> {
  await db.progress.put({
    exerciseId,
    code: starterCode,
    status: 'belum',
    attemptsCount: 0,
    hintsUsed: 0,
    updatedAt: Date.now(),
  });
}
