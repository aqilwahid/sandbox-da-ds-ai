import { APP } from '../config';
import { getContent } from '../content/loader';
import { TRACKS } from '../content/types';
import { downloadText, toCsv } from '../lib/format';
import { getPrefs } from '../lib/prefs';
import { db, type ExerciseProgressRecord } from './index';

export interface ExportData {
  app: string;
  version: number;
  appVersion: string;
  participant: string;
  exportedAt: string;
  summary: Record<string, { lulus: number; total: number }>;
  totalRecords: number;
  records: ExerciseProgressRecord[];
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'peserta';
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
}

export async function buildExport(): Promise<ExportData> {
  const records = await db.progress.toArray();
  const { exercises } = getContent();
  const summary: ExportData['summary'] = {};
  for (const t of Object.keys(TRACKS)) {
    const list = exercises.filter((e) => e.track === t);
    summary[t] = {
      total: list.length,
      lulus: list.filter((e) => records.find((r) => r.exerciseId === e.id)?.status === 'lulus').length,
    };
  }
  return {
    app: 'sandbox-da-ds-ai',
    version: 2,
    appVersion: APP.version,
    participant: getPrefs().participantName,
    exportedAt: new Date().toISOString(),
    summary,
    totalRecords: records.length,
    records,
  };
}

export async function exportProgressToJson(): Promise<void> {
  const data = await buildExport();
  downloadText(`progres-${slug(data.participant)}-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

export async function exportProgressToCsv(): Promise<void> {
  const data = await buildExport();
  const { exercises } = getContent();
  const rows = exercises.map((ex) => {
    const r = data.records.find((x) => x.exerciseId === ex.id);
    return [
      data.participant,
      TRACKS[ex.track].name,
      ex.id,
      ex.frontmatter.title,
      r?.status ?? 'belum',
      r?.lastScore ? `${r.lastScore.passed}/${r.lastScore.total}` : '',
      r?.attemptsCount ?? 0,
      r?.hintsUsed ?? 0,
      r?.solutionViewed ? 'ya' : 'tidak',
      r?.updatedAt ? new Date(r.updatedAt).toISOString() : '',
    ];
  });
  const csv = toCsv(
    ['peserta', 'track', 'id_latihan', 'judul', 'status', 'kriteria_terakhir', 'percobaan', 'hint_dipakai', 'lihat_solusi', 'terakhir_diubah'],
    rows,
  );
  downloadText(`progres-${slug(data.participant)}-${stamp()}.csv`, csv, 'text/csv');
}

export async function importProgressFromJson(jsonText: string): Promise<{ count: number }> {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error('File bukan JSON yang valid.');
  }
  const records: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { records?: unknown[] })?.records)
      ? (data as { records: unknown[] }).records
      : [];
  if (!records.length) throw new Error('File tidak berisi data progres.');
  const valid: ExerciseProgressRecord[] = [];
  for (const raw of records) {
    const r = raw as Partial<ExerciseProgressRecord>;
    if (!r || typeof r.exerciseId !== 'string') continue;
    valid.push({
      exerciseId: r.exerciseId,
      code: typeof r.code === 'string' ? r.code : '',
      status: (['belum', 'dicoba', 'lulus', 'lihat-solusi'] as const).includes(r.status as never)
        ? (r.status as ExerciseProgressRecord['status'])
        : 'dicoba',
      attemptsCount: Number(r.attemptsCount) || 0,
      hintsUsed: Number(r.hintsUsed) || 0,
      solutionViewed: Boolean(r.solutionViewed || r.status === 'lihat-solusi'),
      lastScore: r.lastScore,
      passedAt: r.passedAt ? Number(r.passedAt) : undefined,
      updatedAt: Number(r.updatedAt) || Date.now(),
    });
  }
  if (!valid.length) throw new Error('Tidak ada catatan progres yang valid.');
  await db.progress.bulkPut(valid);
  return { count: valid.length };
}
