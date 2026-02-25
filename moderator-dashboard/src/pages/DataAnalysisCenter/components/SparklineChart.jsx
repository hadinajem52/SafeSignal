import React from "react";
import { CHART_X_LABELS } from "./constants";

export default function SparklineChart({
  data = [],
  color = "var(--color-primary)",
}) {
  const values = data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const maxVal = Math.max(10, ...values);
  const W = 320,
    H = 100,
    padL = 36,
    padR = 8,
    padT = 10,
    padB = 22;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const pts = values.map((val, i) => ({
    x: padL + (i / (values.length - 1)) * cW,
    y: padT + cH - (val / maxVal) * cH,
  }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${pts.at(-1).x.toFixed(1)} ${(padT + cH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padT + cH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
      <defs>
        <linearGradient id="v2SG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1.0].map((r) => {
        const y = padT + cH - r * cH;
        return (
          <g key={r}>
            <line
              x1={padL}
              y1={y.toFixed(1)}
              x2={W - padR}
              y2={y.toFixed(1)}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={padL - 4}
              y={(y + 3.5).toFixed(1)}
              textAnchor="end"
              fill="var(--color-text-muted)"
              fontSize="8"
              fontFamily="Source Sans 3, sans-serif"
            >
              {Math.round(r * maxVal)}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#v2SG)" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={pts.at(-1).x.toFixed(1)}
        cy={pts.at(-1).y.toFixed(1)}
        r="3.5"
        fill={color}
      />

      {CHART_X_LABELS.slice(0, values.length).map((lbl, i) =>
        i % Math.ceil(CHART_X_LABELS.length / 5) === 0 ? (
          <text
            key={i}
            x={(padL + (i / (values.length - 1)) * cW).toFixed(1)}
            y={H - 5}
            textAnchor="middle"
            fill="var(--color-text-muted)"
            fontSize="8"
            fontFamily="Source Sans 3, sans-serif"
          >
            {lbl}
          </text>
        ) : null,
      )}
    </svg>
  );
}
