const CONSTELLATION_STATE_META = {
  corroborated: {
    label: "Corroborated",
    tone: "success",
    color: "#30A46C",
    description: "Nearby community signals support this report.",
  },
  mixed_signals: {
    label: "Mixed signals",
    tone: "warning",
    color: "#F5A623",
    description: "Nearby signals conflict or need staff judgment.",
  },
  likely_ended: {
    label: "Likely ended",
    tone: "muted",
    color: "#5C7390",
    description: "Community signals suggest the activity may have ended.",
  },
  activity_not_confirmed: {
    label: "Not confirmed",
    tone: "muted",
    color: "#5C7390",
    description: "Nearby signals do not confirm ongoing activity.",
  },
  single_report: {
    label: "Single report",
    tone: "muted",
    color: "#5C7390",
    description: "No corroborating community signal yet.",
  },
};

export function getConstellationMeta(constellation) {
  if (!constellation) return null;

  if (constellation.status === "flagged") {
    return {
      label: "Signal review",
      tone: "danger",
      color: "#E5484D",
      description: "Signal pattern is held for staff review.",
    };
  }

  return (
    CONSTELLATION_STATE_META[constellation.confidenceState] ||
    CONSTELLATION_STATE_META.single_report
  );
}

export function formatConstellationScore(score) {
  const parsed = Number(score);
  if (!Number.isFinite(parsed)) return "N/A";
  return `${Math.round(parsed * 100)}%`;
}

export function getConstellationPriorityBoost(constellation) {
  if (!constellation) return 0;
  if (constellation.status === "flagged") return 120;
  if (constellation.confidenceState === "corroborated") return 90;
  if (constellation.confidenceState === "mixed_signals") return 45;
  return 0;
}

export function getConstellationMarkerStyle(constellation) {
  const meta = getConstellationMeta(constellation);
  if (!meta) return null;

  const confidence = Number(constellation.confidenceScore);
  const opacity = Number.isFinite(confidence)
    ? Math.min(Math.max(confidence, 0.25), 0.85)
    : 0.45;

  return {
    color: meta.color,
    opacity,
    label: meta.label,
  };
}
