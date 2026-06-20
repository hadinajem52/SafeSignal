export function heatColor(val, max) {
  if (val === 0) return "var(--dac-surface2)";
  const t = Math.log1p(val) / Math.log1p(max || 1);
  if (t < 0.25) return "rgba(59,158,255,0.15)";
  if (t < 0.5) return "rgba(59,158,255,0.4)";
  if (t < 0.75) return "rgba(245,166,35,0.5)";
  return "rgba(229,72,77,0.7)";
}

export function trendPath(data, W, H, maxVal) {
  const step = W / Math.max(data.length - 1, 1);
  return data
    .map((v, i) => {
      const x = i * step;
      const y = H - (v / (maxVal || 1)) * H * 0.92;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function trendArea(data, W, H, maxVal) {
  return trendPath(data, W, H, maxVal) + ` L ${W} ${H} L 0 ${H} Z`;
}
