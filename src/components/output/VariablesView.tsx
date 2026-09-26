import React, { useEffect, useState } from 'react';
import { Eye, Loader2, Variable } from 'lucide-react';
import { pythonRuntime } from '../../runtime/pythonRuntime';
import type { DisplayItem, VariableInfo } from '../../runtime/types';
import { DisplayBlock } from './ResultsView';

const KIND_STYLE: Record<string, string> = {
  dataframe: 'text-track-datascience border-track-datascience/40',
  series: 'text-track-datascience border-track-datascience/40',
  ndarray: 'text-info border-info/40',
  list: 'text-ok border-ok/40',
  dict: 'text-warn border-warn/40',
  number: 'text-info border-info/40',
  str: 'text-ok border-ok/40',
  function: 'text-accent border-accent/40',
  model: 'text-err border-err/40',
};

export const VariablesView: React.FC<{ variables: VariableInfo[]; runKey: number }> = ({ variables, runKey }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [item, setItem] = useState<DisplayItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(null);
    setItem(null);
  }, [runKey]);

  const open = async (name: string) => {
    setSelected(name);
    setLoading(true);
    setError(null);
    try {
      setItem(await pythonRuntime.getVariable(name));
    } catch (e) {
      setError((e as Error).message);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  if (!variables.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-fg3">
        <Variable size={20} />
        Belum ada variabel. Setelah kode dijalankan, semua variabel yang kamu buat tampil di sini.
      </div>
    );
  }
  return (
    <div className="space-y-3 p-3">
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-xs">
          <thead className="bg-panel2 text-2xs text-fg3">
            <tr>
              <th className="px-3 py-1.5 font-medium">Nama</th>
              <th className="px-3 py-1.5 font-medium">Tipe</th>
              <th className="px-3 py-1.5 font-medium">Isi / ukuran</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {variables.map((v) => (
              <tr key={v.name} className={`border-t border-line ${selected === v.name ? 'bg-accent/10' : 'hover:bg-panel3/60'}`}>
                <td className="px-3 py-1.5 font-mono font-semibold text-fg">{v.name}</td>
                <td className="px-3 py-1.5">
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-2xs ${KIND_STYLE[v.kind] || 'border-line text-fg2'}`}>{v.type}</span>
                </td>
                <td className="max-w-[340px] px-3 py-1.5 text-fg2">
                  <div className="truncate font-mono" title={v.summary}>
                    {v.summary}
                  </div>
                  {v.detail && <div className="truncate text-2xs text-fg3">kolom: {v.detail}</div>}
                </td>
                <td className="px-2">
                  {v.viewable && (
                    <button type="button" className="btn-ghost !px-1.5" onClick={() => open(v.name)} title={`Lihat isi ${v.name}`}>
                      <Eye size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-fg3">
              <Loader2 size={13} className="animate-spin" /> Memuat {selected}…
            </div>
          )}
          {error && <div className="text-xs text-err">{error}</div>}
          {item && !loading && <DisplayBlock item={item} />}
        </div>
      )}
    </div>
  );
};
