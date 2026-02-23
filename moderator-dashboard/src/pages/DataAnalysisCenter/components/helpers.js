export function severityClass(sev) {
  return sev === "critical"
    ? "text-purple-400"
    : sev === "high"
      ? "text-warning"
      : sev === "medium"
        ? "text-accent"
        : "text-success";
}

export function leiStatusColor(status) {
  const map = {
    verified: "text-warning",
    dispatched: "text-primary",
    on_scene: "text-info",
    investigating: "text-purple-400",
    police_closed: "text-success",
  };
  return map[status] || "text-muted";
}

export function getPeriodMs(period) {
  const day = 86400000;
  return (
    { "7d": 7 * day, "30d": 30 * day, "90d": 90 * day, "1y": 365 * day }[
      period
    ] ?? 30 * day
  );
}

export function filterByPeriod(items, period) {
  const cutoff = Date.now() - getPeriodMs(period);
  return items.filter((i) => new Date(i.created_at).getTime() >= cutoff);
}

export function diffMinutes(a, b) {
  return (new Date(b) - new Date(a)) / 60000;
}

export function heatColor(val, max) {
  if (val === 0) return "var(--dac-surface2)";
  const t = val / max;
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
