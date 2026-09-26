import React, { useMemo } from 'react';
import { copyText } from '../../lib/format';
import { splitSegments } from '../../lib/markdown';
import { VisualBlock } from '../visuals/VisualBlock';
import { VisualContext } from '../visuals/shared';

/** Markdown + blok ```visual yang dirender sebagai komponen interaktif. */
export const MarkdownView: React.FC<{ source: string; language: 'sql' | 'python'; className?: string }> = ({ source, language, className }) => {
  const segments = useMemo(() => splitSegments(source), [source]);
  const onClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement).closest('[data-copy]') as HTMLButtonElement | null;
    if (!btn) return;
    const code = btn.closest('.code-wrap')?.querySelector('code')?.textContent ?? '';
    if (await copyText(code)) {
      const old = btn.textContent;
      btn.textContent = 'Tersalin ✓';
      setTimeout(() => (btn.textContent = old), 1400);
    }
  };
  return (
    <VisualContext.Provider value={{ language }}>
      <div className={className} onClick={onClick}>
        {segments.map((s, i) =>
          s.type === 'md' ? (
            <div key={i} className="prose-sbx" dangerouslySetInnerHTML={{ __html: s.html }} />
          ) : (
            <VisualBlock key={s.key} source={s.yaml} />
          ),
        )}
      </div>
    </VisualContext.Provider>
  );
};
