export type TrackId = 'analyst' | 'datascience' | 'ai';

export interface ExerciseFrontmatter {
  id: string;
  track: TrackId;
  title: string;
  estimatedMinutes: number;
  runtime: string;
  packages: string[];
  datasets: string[];
  prerequisites: string[];
}

export interface ExerciseSections {
  instruksi: string;
  starter: string;
  solusi: string;
  checker: string;
  hints: string[];
}

export interface Exercise {
  id: string;
  frontmatter: ExerciseFrontmatter;
  sections: ExerciseSections;
  filePath: string;
  track: TrackId;
  order: number;
  slug: string;
}

export interface TrackMetadata {
  id: TrackId;
  name: string;
  description: string;
  icon: string;
  badgeColor: string;
}

export const TRACKS: Record<TrackId, TrackMetadata> = {
  analyst: {
    id: 'analyst',
    name: 'Data Analyst',
    description: 'Kueri SQL, Agregasi, Transformasi Data, & Analitik Bisnis',
    icon: 'Database',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  datascience: {
    id: 'datascience',
    name: 'Data Science',
    description: 'Python, Pandas, Visualisasi Data, & Statistika Terapan',
    icon: 'BrainCircuit',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  ai: {
    id: 'ai',
    name: 'AI Engineering',
    description: 'Prompt Engineering, RAG, Evaluasi LLM, & AI Agents',
    icon: 'Sparkles',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
};
