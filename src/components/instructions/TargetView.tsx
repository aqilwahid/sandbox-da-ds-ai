import React, { useEffect, useState } from 'react';
import { Crosshair, Loader2 } from 'lucide-react';
import type { Exercise } from '../../content/types';
import { datasetRefs } from '../../content/loader';
import { pythonRuntime, useRuntimeState } from '../../runtime/pythonRuntime';
import type { TableDisplay } from '../../runtime/types';
import { TableCard } from '../output/TableCard';

const cache = new Map<string, TableDisplay | null>();

/** Tabel hasil yang diharapkan (dihitung dari solusi di browser, tanpa menampilkan kodenya). */
export const TargetView: React.FC<{ exercise: Exercise }> = ({ exercise }) => {
  const rt = useRuntimeState();
  const [table, setTable] = useState<TableDisplay | null | undefined>(cache.get(exercise.id));
  const [error, setError] = useState<string | null>(null);
  const ready = rt.status === 'ready' || rt.status === 'busy';

  useEffect(() => {
    if (cache.has(exercise.id)) {
      setTable(cache.get(exercise.id));
      return;
    }
    if (!ready) return;
    let alive = true;
    setError(null);
    pythonRuntime
      .expected({ language: exercise.language, solution: exercise.sections.solusi, datasets: datasetRefs(exercise) })
      .then((t) => {
        cache.set(exercise.id, t);
        if (alive) setTable(t);
      })
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [exercise, ready]);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-2 rounded-lg border border-line bg-panel2 p-3 text-xs text-fg2">
        <Crosshair size={15} className="mt-0.5 shrink-0 text-accent" />
        <div>
          Ini <strong className="text-fg">bentuk hasil yang diharapkan</strong> — kolom, jumlah baris, dan nilainya. Kodenya tidak ditampilkan; tugasmu menulis
          kueri yang menghasilkan tabel yang sama.
        </div>
      </div>
      {table === undefined && !error && (
        <div className="flex items-center gap-2 text-xs text-fg3">
          <Loader2 size={13} className="animate-spin" /> {ready ? 'Menghitung target…' : 'Menunggu Python siap…'}
        </div>
      )}
      {error && <div className="text-xs text-err">Target tidak dapat dihitung: {error}</div>}
      {table && <TableCard table={{ ...table, title: 'Target hasil' }} maxHeight={420} />}
    </div>
  );
};
