export type TrackId = 'analyst' | 'datascience' | 'ai';
export type Language = 'sql' | 'python';
export type Level = 'pemula' | 'menengah' | 'lanjut';

export const TRACK_IDS: TrackId[] = ['analyst', 'datascience', 'ai'];
export const LEVELS: Level[] = ['pemula', 'menengah', 'lanjut'];

export interface ExerciseFrontmatter {
  id: string;
  track: TrackId;
  title: string;
  level: Level;
  estimatedMinutes: number;
  language: Language;
  /** Nama dataset (lihat content/datasets.yaml). SQL: jadi nama tabel. Python: file <nama>.csv di folder kerja. */
  datasets: string[];
  /** Paket Pyodide tambahan yang dimuat sebelum latihan dibuka (import di kode juga dideteksi otomatis). */
  packages: string[];
  prerequisites: string[];
  /** Konsep/kata kunci yang dilatih — ditampilkan sebagai chip. */
  concepts: string[];
  /** Batas waktu eksekusi (detik). */
  timeoutSec: number;
}

export interface ExerciseSections {
  instruksi: string;
  starter: string;
  solusi: string;
  checker: string;
  hints: string[];
  /** Penjelasan yang dibuka setelah lulus atau setelah melihat solusi. */
  pembahasan: string;
}

export interface Exercise {
  id: string;
  frontmatter: ExerciseFrontmatter;
  sections: ExerciseSections;
  filePath: string;
  track: TrackId;
  language: Language;
  order: number;
  slug: string;
}

export interface DatasetColumnInfo {
  name: string;
  description: string;
}

export interface DatasetInfo {
  name: string;
  file: string;
  title: string;
  description: string;
  source?: string;
  columns: DatasetColumnInfo[];
}

export interface TrackMetadata {
  id: TrackId;
  name: string;
  short: string;
  tagline: string;
  description: string;
  language: Language;
  skills: string[];
}

export const TRACKS: Record<TrackId, TrackMetadata> = {
  analyst: {
    id: 'analyst',
    name: 'Data Analyst',
    short: 'DA',
    tagline: 'Menjawab pertanyaan bisnis dengan SQL',
    description:
      'Kueri SQL sungguhan (DuckDB) di atas data penjualan toko online: memilih, menyaring, mengurutkan, agregasi, JOIN, tren waktu, dan window function. Setiap hasil kueri bisa langsung divisualisasikan.',
    language: 'sql',
    skills: ['SELECT & WHERE', 'GROUP BY', 'JOIN', 'Tren waktu', 'Window function'],
  },
  datascience: {
    id: 'datascience',
    name: 'Data Science',
    short: 'DS',
    tagline: 'Dari data mentah sampai model prediksi',
    description:
      'Python + pandas untuk membaca, membersihkan, dan meringkas data; matplotlib untuk visualisasi; scikit-learn untuk regresi dan klasifikasi — semuanya berjalan di browser.',
    language: 'python',
    skills: ['pandas', 'Data cleaning', 'Visualisasi', 'Regresi', 'Klasifikasi'],
  },
  ai: {
    id: 'ai',
    name: 'AI Engineering',
    short: 'AI',
    tagline: 'Memahami cara kerja aplikasi LLM',
    description:
      'Simulasi di browser tanpa API key: tokenisasi, temperature, prompt terstruktur, validasi JSON, embedding & kemiripan, mini-RAG, evaluasi, dan agent dengan tool calling.',
    language: 'python',
    skills: ['Tokenisasi', 'Prompting', 'Embedding', 'RAG', 'Agent'],
  },
};

export const LEVEL_LABEL: Record<Level, string> = {
  pemula: 'Pemula',
  menengah: 'Menengah',
  lanjut: 'Lanjut',
};
