import React, { useMemo, useState } from 'react';
import { axisFormat, niceTicks, seriesColor, textWidth, truncateLabel, useElementWidth, valueFormat } from './chartUtils';
import { ChartTooltip } from './Tooltip';

interface Props {
  categories: string[];
  values: (number | null)[];
  valueLabel: string;
  categoryLabel?: string;
  orientation?: 'auto' | 'horizontal' | 'vertical';
  colorIndex?: number;
  maxHeight?: number;
}

/** Grafik batang satu seri: batang tipis (≤24px), ujung membulat, label nilai selektif, tooltip per batang. */
export const BarChart: React.FC<Props> = ({ categories, values, valueLabel, categoryLabel, orientation = 'auto', colorIndex = 0 }) => {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const nums = values.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0));
  const longest = Math.max(0, ...categories.map((c) => c.length));
  const horizontal = orientation === 'horizontal' || (orientation === 'auto' && (categories.length > 7 || longest > 11));
  const color = seriesColor(colorIndex);

  const dom = useMemo(() => {
    const min = Math.min(0, ...nums);
    const max = Math.max(0, ...nums);
    const ticks = niceTicks(min, max, horizontal ? 4 : 5);
    return { ticks, lo: ticks[0], hi: ticks[ticks.length - 1] };
  }, [nums, horizontal]);

  if (!width) return <div ref={ref} className="h-40 w-full" />;
  const showValues = categories.length <= 14;

  if (horizontal) {
    const labelW = Math.min(width * 0.38, Math.max(60, textWidth(categories.reduce((a, b) => (a.length > b.length ? a : b), ''), 11) + 8));
    const rowH = 26;
    const barH = Math.min(18, rowH - 8);
    const top = 8;
    const bottom = 26;
    const right = showValues ? 64 : 16;
    const plotW = Math.max(40, width - labelW - right);
    const h = top + categories.length * rowH + bottom;
    const sx = (v: number) => labelW + ((v - dom.lo) / (dom.hi - dom.lo || 1)) * plotW;
    const zeroX = sx(0);
    return (
      <div ref={ref} className="relative w-full" onMouseLeave={() => setHover(null)}>
        <svg width={width} height={h} role="img" aria-label={`Grafik batang ${valueLabel} per ${categoryLabel ?? 'kategori'}`}>
          {dom.ticks.map((t) => (
            <g key={t}>
              <line x1={sx(t)} x2={sx(t)} y1={top} y2={h - bottom} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={sx(t)} y={h - bottom + 16} textAnchor="middle" fontSize={10} fill="var(--chart-text)" className="tabular">
                {axisFormat(t)}
              </text>
            </g>
          ))}
          <line x1={zeroX} x2={zeroX} y1={top} y2={h - bottom} stroke="var(--chart-axis)" strokeWidth={1} />
          {categories.map((c, i) => {
            const y = top + i * rowH + (rowH - barH) / 2;
            const v = nums[i];
            const x0 = Math.min(zeroX, sx(v));
            const w = Math.max(1, Math.abs(sx(v) - zeroX));
            const r = Math.min(4, w / 2, barH / 2);
            const pos = v >= 0;
            // Ujung data membulat, pangkal (baseline) persegi
            const d = pos
              ? `M${x0},${y} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${barH - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(w - r)} z`
              : `M${x0 + w},${y} h${-(w - r)} a${r},${r} 0 0 0 ${-r},${r} v${barH - 2 * r} a${r},${r} 0 0 0 ${r},${r} h${w - r} z`;
            const label = valueFormat(v);
            return (
              <g
                key={i}
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setMouse({ x: e.clientX - box.left, y: e.clientY - box.top });
                  setHover(i);
                }}
              >
                <rect x={0} y={top + i * rowH} width={width} height={rowH} fill="transparent" />
                <text x={labelW - 8} y={y + barH / 2 + 4} textAnchor="end" fontSize={11} fill="var(--chart-text-strong)">
                  {truncateLabel(c, labelW - 12)}
                </text>
                <path d={d} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
                {showValues && (
                  <text x={pos ? sx(v) + 6 : sx(v) - 6} y={y + barH / 2 + 4} textAnchor={pos ? 'start' : 'end'} fontSize={10.5} fill="var(--chart-text)" className="tabular">
                    {axisFormat(v)}
                  </text>
                )}
                <title>{`${c}: ${label}`}</title>
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <ChartTooltip x={mouse.x} y={mouse.y} containerWidth={width} title={categories[hover]} rows={[{ label: valueLabel, value: valueFormat(nums[hover]), color }]} />
        )}
      </div>
    );
  }

  // Vertikal (kolom)
  const left = Math.max(40, textWidth(axisFormat(dom.hi), 10) + 14);
  const top = 18;
  const bottom = 34;
  const right = 10;
  const h = 260;
  const plotW = Math.max(40, width - left - right);
  const plotH = h - top - bottom;
  const band = plotW / categories.length;
  const barW = Math.min(24, band * 0.6);
  const sy = (v: number) => top + plotH - ((v - dom.lo) / (dom.hi - dom.lo || 1)) * plotH;
  const zeroY = sy(0);
  return (
    <div ref={ref} className="relative w-full" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={h} role="img" aria-label={`Grafik kolom ${valueLabel} per ${categoryLabel ?? 'kategori'}`}>
        {dom.ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={width - right} y1={sy(t)} y2={sy(t)} stroke="var(--chart-grid)" strokeWidth={1} />
            <text x={left - 8} y={sy(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-text)" className="tabular">
              {axisFormat(t)}
            </text>
          </g>
        ))}
        <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} stroke="var(--chart-axis)" strokeWidth={1} />
        {categories.map((c, i) => {
          const cx = left + band * i + band / 2;
          const v = nums[i];
          const y0 = Math.min(zeroY, sy(v));
          const bh = Math.max(1, Math.abs(sy(v) - zeroY));
          const r = Math.min(4, bh / 2, barW / 2);
          const x = cx - barW / 2;
          const pos = v >= 0;
          const d = pos
            ? `M${x},${y0 + bh} v${-(bh - r)} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${bh - r} z`
            : `M${x},${y0} v${bh - r} a${r},${r} 0 0 0 ${r},${r} h${barW - 2 * r} a${r},${r} 0 0 0 ${r},${-r} v${-(bh - r)} z`;
          return (
            <g
              key={i}
              onMouseMove={(e) => {
                const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setMouse({ x: e.clientX - box.left, y: e.clientY - box.top });
                setHover(i);
              }}
            >
              <rect x={left + band * i} y={top} width={band} height={plotH} fill="transparent" />
              <path d={d} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
              {showValues && band > 34 && (
                <text x={cx} y={pos ? y0 - 5 : y0 + bh + 12} textAnchor="middle" fontSize={10} fill="var(--chart-text)" className="tabular">
                  {axisFormat(v)}
                </text>
              )}
              <text x={cx} y={h - bottom + 15} textAnchor="middle" fontSize={10.5} fill="var(--chart-text-strong)">
                {truncateLabel(c, band - 4, 10.5)}
              </text>
              <title>{`${c}: ${valueFormat(v)}`}</title>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <ChartTooltip x={mouse.x} y={mouse.y} containerWidth={width} title={categories[hover]} rows={[{ label: valueLabel, value: valueFormat(nums[hover]), color }]} />
      )}
    </div>
  );
};
