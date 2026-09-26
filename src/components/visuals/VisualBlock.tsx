import React, { useMemo } from 'react';
import yaml from 'js-yaml';
import { AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { Alur } from './Alur';
import { Anatomi } from './Anatomi';
import { ConfusionMatrix } from './ConfusionMatrix';
import { Embedding } from './Embedding';
import { JoinVisual } from './JoinVisual';
import { Perbandingan } from './Perbandingan';
import { PilihGrafik } from './PilihGrafik';
import { Regresi } from './Regresi';
import { SplitData } from './SplitData';
import { Struktur } from './Struktur';
import { TabelVisual } from './TabelVisual';
import { Temperature } from './Temperature';
import { Tokenisasi } from './Tokenisasi';
import { Transformasi } from './Transformasi';

type Spec = Record<string, unknown>;
const REGISTRY: Record<string, React.FC<{ spec: Spec }>> = {
  anatomi: Anatomi,
  tabel: TabelVisual,
  transformasi: Transformasi,
  join: JoinVisual,
  alur: Alur,
  struktur: Struktur,
  'pilih-grafik': PilihGrafik,
  regresi: Regresi,
  'split-data': SplitData,
  'confusion-matrix': ConfusionMatrix,
  tokenisasi: Tokenisasi,
  temperature: Temperature,
  embedding: Embedding,
  perbandingan: Perbandingan,
};

export const VISUAL_TYPES = Object.keys(REGISTRY);

const Problem: React.FC<{ message: string }> = ({ message }) => (
  <div className="my-4 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs text-fg">
    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />
    <div>
      <strong>Blok visual tidak bisa ditampilkan.</strong>
      <div className="mt-0.5 font-mono text-2xs text-fg2">{message}</div>
    </div>
  </div>
);

export const VisualBlock: React.FC<{ source: string }> = ({ source }) => {
  const parsed = useMemo(() => {
    try {
      const spec = yaml.load(source) as Spec;
      if (!spec || typeof spec !== 'object') return { error: 'Isi blok visual kosong.' };
      return { spec };
    } catch (e) {
      return { error: `YAML tidak valid: ${(e as Error).message.split('\n')[0]}` };
    }
  }, [source]);
  if ('error' in parsed) return <Problem message={parsed.error as string} />;
  const kind = String(parsed.spec.jenis || parsed.spec.type || '').toLowerCase().trim();
  const Comp = REGISTRY[kind];
  if (!Comp) return <Problem message={`Jenis visual "${kind}" tidak dikenal. Pilihan: ${VISUAL_TYPES.join(', ')}`} />;
  return (
    <ErrorBoundary label={`Visual ${kind}`} compact>
      <Comp spec={parsed.spec} />
    </ErrorBoundary>
  );
};
