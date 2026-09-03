import { db, type ExerciseProgressRecord } from './index';

export interface ExportData {
  app: string;
  version: number;
  exportedAt: string;
  totalRecords: number;
  records: ExerciseProgressRecord[];
}

export async function exportProgressToJson(): Promise<void> {
  const records = await db.progress.toArray();
  const exportPayload: ExportData = {
    app: 'hands-on-coding-platform',
    version: 1,
    exportedAt: new Date().toISOString(),
    totalRecords: records.length,
    records,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `progres-latihan-${timestamp}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importProgressFromJson(jsonText: string): Promise<{ count: number }> {
  try {
    const data = JSON.parse(jsonText);
    let recordsToImport: ExerciseProgressRecord[] = [];

    if (data && Array.isArray(data.records)) {
      recordsToImport = data.records;
    } else if (Array.isArray(data)) {
      recordsToImport = data;
    } else {
      throw new Error('Format file JSON tidak valid. Properti "records" tidak ditemukan.');
    }

    if (recordsToImport.length === 0) {
      throw new Error('File JSON tidak memuat data latihan.');
    }

    // Validate structure of each record
    const validatedRecords: ExerciseProgressRecord[] = [];
    for (const r of recordsToImport) {
      if (!r.exerciseId || typeof r.exerciseId !== 'string') {
        throw new Error('Ditemukan record dengan exerciseId tidak valid.');
      }

      validatedRecords.push({
        exerciseId: String(r.exerciseId),
        code: typeof r.code === 'string' ? r.code : '',
        status: ['belum', 'dicoba', 'lulus', 'lihat-solusi'].includes(r.status)
          ? (r.status as any)
          : 'dicoba',
        attemptsCount: Number(r.attemptsCount) || 0,
        hintsUsed: Number(r.hintsUsed) || 0,
        passedAt: r.passedAt ? Number(r.passedAt) : undefined,
        updatedAt: Number(r.updatedAt) || Date.now(),
      });
    }

    await db.progress.bulkPut(validatedRecords);
    return { count: validatedRecords.length };
  } catch (err: any) {
    throw new Error(`Gagal impor progres: ${err.message || 'File tidak valid'}`);
  }
}
