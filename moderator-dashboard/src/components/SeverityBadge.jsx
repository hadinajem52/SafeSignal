import React from "react";
import { SEVERITY_VARIANTS } from "../utils/incidentUtils";

// Matches the LEI page SEVERITY_COLOR palette exactly
const SEVERITY_COLOR = {
  low: "#3B9EFF",
  medium: "#F5A623",
  high: "#E5484D",
  critical: "#A855F7",
};

const SEVERITY_STYLES = {
  low: {
    pill: "bg-[var(--color-badge-green-bg,#dcfce7)] text-[var(--color-badge-green-text,#166534)] border border-[var(--color-badge-green-border,#bbf7d0)]",
    color: "text-success",
  },
  medium: {
    pill: "bg-[var(--color-badge-yellow-bg,#fef9c3)] text-[var(--color-badge-yellow-text,#854d0e)] border border-[var(--color-badge-yellow-border,#fde68a)]",
    color: "text-warning",
  },
  high: {
    pill: "bg-[var(--color-badge-red-bg,#fee2e2)] text-[var(--color-badge-red-text,#991b1b)] border border-[var(--color-badge-red-border,#fecaca)]",
    color: "text-error",
  },
  critical: {
    pill: "bg-[var(--color-badge-purple-bg,rgba(168,85,247,0.12))] text-[var(--color-badge-purple-text,#a855f7)] border border-[var(--color-badge-purple-border,rgba(168,85,247,0.20))]",
    color: "text-purple-400",
  },
};

const DEFAULT_STYLE = {
  pill: "bg-[var(--color-badge-gray-bg,#f1f5f9)] text-[var(--color-badge-gray-text,#475569)] border border-[var(--color-badge-gray-border,#e2e8f0)]",
  color: "text-muted",
};

function SeverityBadge({
  severity,
  variant: _variant = SEVERITY_VARIANTS.REPORTS,
  display = "pill",
}) {
  const safeSeverity = severity || "unknown";
  const styles = SEVERITY_STYLES[safeSeverity] || DEFAULT_STYLE;

  if (display === "initial") {
    // Match LEI SeverityDots exactly: letter + 3 dots with cascading opacity
    const color = SEVERITY_COLOR[safeSeverity] || "#5C7390";
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
        }}
        aria-label={`Severity: ${safeSeverity}`}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            color,
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          {safeSeverity.charAt(0)}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          {[0.25, 0.55, 1].map((opacity, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: color,
                opacity,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (display === "text") {
    return (
      <span className={`font-semibold capitalize ${styles.color}`}>
        {safeSeverity}
      </span>
    );
  }

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${styles.pill}`}
    >
      {safeSeverity.toUpperCase()}
    </span>
  );
}

export default SeverityBadge;
