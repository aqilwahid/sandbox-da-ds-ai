import type { Exercise } from './types';

export interface ValidationIssue {
  type: 'error' | 'warning';
  file?: string;
  exerciseId?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateExercises(exercises: Exercise[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  const idMap = new Map<string, Exercise>();

  // 1. Check duplicate IDs & required fields
  for (const ex of exercises) {
    if (!ex.id) {
      issues.push({
        type: 'error',
        file: ex.filePath,
        message: 'Latihan wajib memiliki properti frontmatter "id".',
      });
      continue;
    }

    if (idMap.has(ex.id)) {
      const existing = idMap.get(ex.id)!;
      issues.push({
        type: 'error',
        file: ex.filePath,
        exerciseId: ex.id,
        message: `ID duplikat ditemukan: "${ex.id}" ada di file "${ex.filePath}" dan "${existing.filePath}". ID harus unik secara global.`,
      });
    } else {
      idMap.set(ex.id, ex);
    }

    // Check title
    if (!ex.frontmatter.title) {
      issues.push({
        type: 'error',
        file: ex.filePath,
        exerciseId: ex.id,
        message: 'Frontmatter "title" wajib diisi.',
      });
    }

    // Check track
    if (!['analyst', 'datascience', 'ai'].includes(ex.frontmatter.track)) {
      issues.push({
        type: 'error',
        file: ex.filePath,
        exerciseId: ex.id,
        message: `Track "${ex.frontmatter.track}" tidak valid. Track yang diizinkan: 'analyst' | 'datascience' | 'ai'.`,
      });
    }

    // Check required sections
    if (!ex.sections.instruksi || !ex.sections.instruksi.trim()) {
      issues.push({
        type: 'error',
        file: ex.filePath,
        exerciseId: ex.id,
        message: 'Section wajib "## instruksi" hilang atau kosong.',
      });
    }

    if (!ex.sections.starter && ex.sections.starter !== '') {
      issues.push({
        type: 'error',
        file: ex.filePath,
        exerciseId: ex.id,
        message: 'Section wajib "## starter" hilang.',
      });
    }

    if (!ex.sections.solusi || !ex.sections.solusi.trim()) {
      issues.push({
        type: 'error',
        file: ex.filePath,
        exerciseId: ex.id,
        message: 'Section wajib "## solusi" hilang atau kosong.',
      });
    }

    if (!ex.sections.checker || !ex.sections.checker.trim()) {
      issues.push({
        type: 'error',
        file: ex.filePath,
        exerciseId: ex.id,
        message: 'Section wajib "## checker" hilang atau kosong.',
      });
    }
  }

  // 2. Check broken prerequisites
  for (const ex of exercises) {
    for (const prereqId of ex.frontmatter.prerequisites) {
      if (!idMap.has(prereqId)) {
        issues.push({
          type: 'error',
          file: ex.filePath,
          exerciseId: ex.id,
          message: `Prerequisite "${prereqId}" tidak ditemukan dalam daftar latihan. Pastikan ID tersebut sudah terdefinisi.`,
        });
      }
    }
  }

  // 3. Check circular prerequisite dependencies (Cycle detection using DFS)
  // Build adjacency list: exerciseId -> prerequisites
  const adj = new Map<string, string[]>();
  exercises.forEach((ex) => {
    adj.set(ex.id, ex.frontmatter.prerequisites);
  });

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cyclePaths: string[][] = [];

  function checkCycle(currentId: string, path: string[]) {
    visited.add(currentId);
    inStack.add(currentId);
    path.push(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const neighbor of neighbors) {
      if (!idMap.has(neighbor)) continue; // Already reported as broken prereq

      if (!visited.has(neighbor)) {
        checkCycle(neighbor, [...path]);
      } else if (inStack.has(neighbor)) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(neighbor);
        const cycle = [...path.slice(cycleStartIndex), neighbor];
        cyclePaths.push(cycle);
      }
    }

    inStack.delete(currentId);
  }

  for (const ex of exercises) {
    if (!visited.has(ex.id)) {
      checkCycle(ex.id, []);
    }
  }

  for (const cycle of cyclePaths) {
    issues.push({
      type: 'error',
      message: `Terdeteksi siklus prasyarat (circular dependency): ${cycle.join(' -> ')}. Setiap alur belajar harus acyclic (DAG).`,
    });
  }

  const errors = issues.filter((i) => i.type === 'error');
  return {
    valid: errors.length === 0,
    issues,
  };
}
