import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const Scalar: React.FC<{ v: unknown }> = ({ v }) => {
  if (v === null) return <span className="text-fg3 italic">None</span>;
  if (typeof v === 'string') return <span className="text-ok">"{v}"</span>;
  if (typeof v === 'number') return <span className="text-info tabular">{String(v)}</span>;
  if (typeof v === 'boolean') return <span className="text-warn">{v ? 'True' : 'False'}</span>;
  return <span>{String(v)}</span>;
};

const Node: React.FC<{ k?: string; v: unknown; depth: number }> = ({ k, v, depth }) => {
  const isObj = v !== null && typeof v === 'object';
  const [open, setOpen] = useState(depth < 2);
  const entries = isObj ? (Array.isArray(v) ? v.map((x, i) => [String(i), x] as const) : Object.entries(v as object)) : [];
  const bracket = Array.isArray(v) ? ['[', ']'] : ['{', '}'];
  return (
    <div style={{ paddingLeft: depth ? 14 : 0 }} className="leading-6">
      {isObj ? (
        <>
          <button type="button" onClick={() => setOpen(!open)} className="inline-flex items-center gap-0.5 text-fg2 hover:text-fg">
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {k !== undefined && <span className="text-accent">{Array.isArray(v) ? '' : `"${k}"`}</span>}
            {k !== undefined && !Array.isArray(v) && <span className="text-fg3">: </span>}
            <span className="text-fg3">
              {bracket[0]}
              {!open && ` ${entries.length} item ${bracket[1]}`}
            </span>
          </button>
          {open && (
            <>
              {entries.map(([ck, cv]) => (
                <Node key={ck} k={Array.isArray(v) ? undefined : ck} v={cv} depth={depth + 1} />
              ))}
              <div className="text-fg3">{bracket[1]}</div>
            </>
          )}
        </>
      ) : (
        <span>
          {k !== undefined && (
            <>
              <span className="text-accent">"{k}"</span>
              <span className="text-fg3">: </span>
            </>
          )}
          <Scalar v={v} />
        </span>
      )}
    </div>
  );
};

export const JsonTree: React.FC<{ data: unknown }> = ({ data }) => (
  <div className="overflow-auto p-3 font-mono text-xs">
    <Node v={data} depth={0} />
  </div>
);
