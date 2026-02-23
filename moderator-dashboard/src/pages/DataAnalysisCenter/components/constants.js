export const UNACTIONED_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export const CHART_RATIOS = [
  0.1, 0.17, 0.13, 0.25, 0.35, 0.3, 0.48, 0.6, 0.65, 0.76, 0.89, 1.0,
];
export const CHART_X_LABELS = [
  "M",
  "T",
  "W",
  "T",
  "F",
  "S",
  "S",
  "M",
  "T",
  "W",
  "T",
  "F",
];

export const HIST_BUCKETS = [
  { label: "0-5m", max: 5, color: "var(--dac-green)" },
  { label: "5-15m", max: 15, color: "var(--dac-green)" },
  { label: "15-30m", max: 30, color: "var(--dac-blue)" },
  { label: "30-60m", max: 60, color: "var(--dac-blue)" },
  { label: "1-2h", max: 120, color: "var(--dac-amber)" },
  { label: "2-4h", max: 240, color: "var(--dac-amber)" },
  { label: ">4h", max: Infinity, color: "var(--dac-red)" },
];

export const DAYS_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
