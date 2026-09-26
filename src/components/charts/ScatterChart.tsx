import React, { useMemo, useState } from 'react';
import { axisFormat, niceTicks, seriesColor, textWidth, useElementWidth, valueFormat } from './chartUtils';
import { ChartTooltip } from './Tooltip';

interface Point {
  x: number;
  y: number;
  label?: string;
}

interface Props {
  points: Point[];
  xLabel: string;
  yLabel: string;
  colorIndex?: number;
  height?: number;
}

/** Scatter: titik r=4 dengan cincin permukaan, hover memilih titik terdekat (target ±24px). */
export const ScatterChart: React.FC<Props> = ({ points, xLabel, yLabel, colorIndex = 0, height = 280 }) => {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const color = seriesColor(colorIndex);
  const dom = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const xt = niceTicks(Math.min(...xs), Math.max(...xs), 5);
    const yt = niceTicks(Math.min(...ys), Math.max(...ys), 5);
    return { xt, yt };
  }, [points]);

  if (!width) return <div ref={ref} className="h-40 w-full" />;
  const left = Math.max(46, textWidth(axisFormat(dom.yt[dom.yt.length - 1]), 10) + 18);
  const right = 14;
  const top = 12;
  const bottom = 40;
  const plotW = Math.max(60, width - left - right);
  const plotH = height - top - bottom;
  const [x0, x1] = [dom.xt[0], dom.xt[dom.xt.length - 1]];
  const [y0, y1] = [dom.yt[0], dom.yt[dom.yt.length - 1]];
  const sx = (v: number) => left + ((v - x0) / (x1 - x0 || 1)) * plotW;
  const sy = (v: number) => top + plotH - ((v - y0) / (y1 - y0 || 1)) * plotH;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - box.left;
    const my = e.clientY - box.top;
    let best = -1;
    let bestD = 24 * 24;
    points.forEach((p, i) => {
      const d = (sx(p.x) - mx) ** 2 + (sy(p.y) - my) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best >= 0 ? best : null);
  };

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`Scatter ${yLabel} terhadap ${xLabel}`}>
        {dom.yt.map((t) => (
          <g key={`y${t}`}>
            <line x1={left} x2={left + plotW} y1={sy(t)} y2={sy(t)} stroke="var(--chart-grid)" />
            <text x={left - 8} y={sy(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--chart-text)" className="tabular">
              {axisFormat(t)}
            </text>
          </g>
        ))}
        {dom.xt.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={top} y2={top + plotH} stroke="var(--chart-grid)" />
            <text x={sx(t)} y={top + plotH + 15} textAnchor="middle" fontSize={10} fill="var(--chart-text)" className="tabular">
              {axisFormat(t)}
            </text>
          </g>
        ))}
        <text x={left + plotW / 2} y={height - 6} textAnchor="middle" fontSize={10.5} fill="var(--chart-text-strong)">
          {xLabel}
        </text>
        <text x={12} y={top + plotH / 2} textAnchor="middle" fontSize={10.5} fill="var(--chart-text-strong)" transform={`rotate(-90 12 ${top + plotH / 2})`}>
          {yLabel}
        </text>
        {points.map((p, i) => (
          <circle
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={hover === i ? 5.5 : 4}
            fill={color}
            fillOpacity={hover === null || hover === i ? 0.85 : 0.45}
            stroke="var(--chart-surface)"
            strokeWidth={2}
          />
        ))}
      </svg>
      {hover !== null && (
        <ChartTooltip
          x={sx(points[hover].x)}
          y={sy(points[hover].y)}
          containerWidth={width}
          title={points[hover].label}
          rows={[
            { label: yLabel, value: valueFormat(points[hover].y), color },
            { label: xLabel, value: valueFormat(points[hover].x) },
          ]}
        />
      )}
    </div>
  );
};
