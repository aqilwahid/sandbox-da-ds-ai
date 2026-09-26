import React, { useMemo, useState } from 'react';
import { axisFormat, niceTicks, seriesColor, textWidth, truncateLabel, useElementWidth, valueFormat } from './chartUtils';
import { ChartTooltip } from './Tooltip';

interface Props {
  labels: string[];
  values: (number | null)[];
  valueLabel: string;
  colorIndex?: number;
}

/** Grafik garis satu seri: garis 2px, area tipis, crosshair yang "menempel" ke titik terdekat. */
export const LineChart: React.FC<Props> = ({ labels, values, valueLabel, colorIndex = 0 }) => {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const color = seriesColor(colorIndex);
  const nums = values.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null));
  const valid = nums.filter((v): v is number => v !== null);
  const dom = useMemo(() => {
    const lo = Math.min(0, ...valid);
    const hi = Math.max(...valid, 0);
    const ticks = niceTicks(lo, hi, 5);
    return { ticks, lo: ticks[0], hi: ticks[ticks.length - 1] };
  }, [valid]);

  if (!width) return <div ref={ref} className="h-40 w-full" />;
  const left = Math.max(42, textWidth(axisFormat(dom.hi), 10) + 14);
  const right = 56;
  const top = 18;
  const bottom = 34;
  const h = 260;
  const plotW = Math.max(60, width - left - right);
  const plotH = h - top - bottom;
  const n = labels.length;
  const sx = (i: number) => left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const sy = (v: number) => top + plotH - ((v - dom.lo) / (dom.hi - dom.lo || 1)) * plotH;
  const pts = nums.map((v, i) => (v === null ? null : ([sx(i), sy(v)] as const)));
  const path = pts.reduce((acc, p, i) => (p ? acc + `${acc && pts[i - 1] ? 'L' : 'M'}${p[0]},${p[1]}` : acc), '');
  const firstIdx = pts.findIndex(Boolean);
  const lastIdx = pts.length - 1 - [...pts].reverse().findIndex(Boolean);
  const area = firstIdx >= 0 ? `${path}L${sx(lastIdx)},${sy(Math.max(dom.lo, 0))}L${sx(firstIdx)},${sy(Math.max(dom.lo, 0))}Z` : '';
  const maxIdx = valid.length ? nums.indexOf(Math.max(...valid)) : -1;
  const labelEvery = Math.max(1, Math.ceil((n * 56) / plotW));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const i = n <= 1 ? 0 : Math.round(((x - left) / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={h} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`Grafik garis ${valueLabel}`}>
        {dom.ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={left + plotW} y1={sy(t)} y2={sy(t)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={left - 8} y={sy(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-text)" className="tabular">
              {axisFormat(t)}
            </text>
          </g>
        ))}
        <line x1={left} x2={left + plotW} y1={sy(Math.max(dom.lo, 0))} y2={sy(Math.max(dom.lo, 0))} stroke="var(--chart-axis)" />
        {labels.map((l, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={i} x={sx(i)} y={h - bottom + 16} textAnchor="middle" fontSize={10} fill="var(--chart-text)">
              {truncateLabel(l, 70, 10)}
            </text>
          ) : null,
        )}
        {area && <path d={area} fill={color} opacity={0.1} />}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && pts[hover] && (
          <line x1={pts[hover]![0]} x2={pts[hover]![0]} y1={top} y2={top + plotH} stroke="var(--chart-axis)" strokeWidth={1} />
        )}
        {[lastIdx, maxIdx, hover]
          .filter((i, k, a): i is number => i !== null && i >= 0 && a.indexOf(i) === k && Boolean(pts[i as number]))
          .map((i) => (
            <circle key={i} cx={pts[i]![0]} cy={pts[i]![1]} r={4} fill={color} stroke="var(--chart-surface)" strokeWidth={2} />
          ))}
        {lastIdx >= 0 && nums[lastIdx] !== null && (
          <text x={sx(lastIdx) + 8} y={sy(nums[lastIdx]!) + 4} fontSize={10.5} fill="var(--chart-text-strong)" className="tabular">
            {axisFormat(nums[lastIdx]!)}
          </text>
        )}
        {maxIdx >= 0 && maxIdx !== lastIdx && (
          <text x={sx(maxIdx)} y={sy(nums[maxIdx]!) - 9} textAnchor="middle" fontSize={10.5} fill="var(--chart-text-strong)" className="tabular">
            {axisFormat(nums[maxIdx]!)} (tertinggi)
          </text>
        )}
      </svg>
      {hover !== null && nums[hover] !== null && (
        <ChartTooltip
          x={sx(hover)}
          y={sy(nums[hover]!)}
          containerWidth={width}
          title={labels[hover]}
          rows={[{ label: valueLabel, value: valueFormat(nums[hover]!), color }]}
        />
      )}
    </div>
  );
};
