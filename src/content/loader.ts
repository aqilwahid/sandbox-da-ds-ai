import { parseExerciseMarkdown } from './parser';
import { validateExercises } from './validator';
import type { Exercise, TrackId } from './types';

// Load all markdown files eager at build time via import.meta.glob
const rawExerciseModules = import.meta.glob('/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

let cachedExercises: Exercise[] | null = null;

export function loadAllExercises(): Exercise[] {
  if (cachedExercises) {
    return cachedExercises;
  }

  const exercises: Exercise[] = [];

  for (const [filePath, rawContent] of Object.entries(rawExerciseModules)) {
    try {
      const exercise = parseExerciseMarkdown(rawContent, filePath);
      exercises.push(exercise);
    } catch (err: any) {
      console.error(`Gagal memuat latihan dari ${filePath}:`, err);
      throw err;
    }
  }

  // Validate all exercises in dev/runtime
  const validation = validateExercises(exercises);
  if (!validation.valid) {
    const errorMessages = validation.issues
      .filter((i) => i.type === 'error')
      .map((i) => `[${i.exerciseId || 'Global'}] ${i.message}`)
      .join('\n');
    console.error('Validasi konten latihan gagal:\n' + errorMessages);
  }

  // Sort exercises by track and order
  exercises.sort((a, b) => {
    if (a.track !== b.track) {
      return a.track.localeCompare(b.track);
    }
    return a.order - b.order;
  });

  cachedExercises = exercises;
  return exercises;
}

export function getExercisesByTrack(track: TrackId): Exercise[] {
  return loadAllExercises().filter((ex) => ex.track === track);
}

export function getExerciseById(id: string): Exercise | undefined {
  return loadAllExercises().find((ex) => ex.id === id);
}

export function getNextExercise(currentId: string): Exercise | undefined {
  const all = loadAllExercises();
  const index = all.findIndex((ex) => ex.id === currentId);
  if (index >= 0 && index + 1 < all.length) {
    return all[index + 1];
  }
  return undefined;
}
