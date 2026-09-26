import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { copyText } from '../../lib/format';

export const ConsoleView: React.FC<{ stdout: string; stderr: string; running: boolean }> = ({ stdout, stderr, running }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (running && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [stdout, stderr, running]);
  if (!stdout && !stderr) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-fg3">
        <Terminal size={20} />
        {running ? 'Menunggu output…' : 'Belum ada output print(). Output konsol muncul di sini secara real-time.'}
      </div>
    );
  }
  return (
    <div className="relative h-full">
      <button
        type="button"
        className="btn absolute right-3 top-2 z-10 !py-1"
        onClick={async () => {
          if (await copyText(stdout + (stderr ? `\n${stderr}` : ''))) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
      >
        {copied ? <Check size={12} className="text-ok" /> : <Copy size={12} />} Salin
      </button>
      <div ref={ref} className="h-full overflow-auto p-3 font-mono text-xs leading-relaxed">
        {stdout && <pre className="whitespace-pre-wrap break-words text-fg">{stdout}</pre>}
        {stderr && <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-warn/10 p-2 text-warn">{stderr}</pre>}
      </div>
    </div>
  );
};
