import { RefreshCw } from "lucide-react";

const SPARKLE_ICON = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path
      d="M6.5 1L7.5 5H11.5L8.5 7.5L9.5 11.5L6.5 9L3.5 11.5L4.5 7.5L1.5 5H5.5L6.5 1Z"
      fill="var(--dac-blue)"
      stroke="var(--dac-blue)"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
  </svg>
);

function timeAgo(date) {
  if (!date) return null;

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return "just now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const SECTION_LABELS = {
  priority: "Priority",
  trend: "Trend",
  pattern: "Pattern",
  funnel_health: "Funnel Health",
};

const TREND_INDICATOR = {
  rising: { symbol: "▲", className: "dac-insights-trend-up" },
  falling: { symbol: "▼", className: "dac-insights-trend-down" },
  stable: { symbol: "—", className: "dac-insights-trend-stable" },
};

export default function AIInsightsCard({
  sections,
  trendDirection = "stable",
  supported = true,
  isLoading,
  isError,
  generatedAt,
  onRefresh,
  isRefreshing,
}) {
  const isBusy = isLoading || isRefreshing;
  const trendIndicator =
    TREND_INDICATOR[trendDirection] || TREND_INDICATOR.stable;
  const sectionEntries = sections
    ? Object.entries(SECTION_LABELS).filter(([key]) => Boolean(sections[key]))
    : [];

  return (
    <div className="dac-card dac-insights-card" aria-busy={isBusy ? "true" : "false"}>
      <div className="dac-card-header dac-insights-header">
        <div className="dac-insights-title">
          {SPARKLE_ICON}
          <span>AI Insights</span>
          <span className="dac-insights-badge">Gemini</span>
        </div>

        <div className="dac-insights-meta">
          {generatedAt ? <span className="dac-insights-age">{timeAgo(generatedAt)}</span> : null}
          <button
            type="button"
            className="dac-insights-refresh"
            onClick={onRefresh}
            disabled={isBusy}
            title="Regenerate insights"
            aria-label="Regenerate insights"
          >
            <span className={isBusy ? "dac-insights-spin" : undefined}>
              <RefreshCw size={12} strokeWidth={1.8} aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>

      <div className="dac-insights-body">
        {isLoading ? (
          <div className="dac-insights-skeleton" aria-hidden="true">
            <div className="dac-insights-skel-line" style={{ width: "92%" }} />
            <div className="dac-insights-skel-line" style={{ width: "78%" }} />
            <div className="dac-insights-skel-line" style={{ width: "55%" }} />
          </div>
        ) : null}

        {!isLoading && isError ? (
          <span className="dac-insights-error">
            Could not generate insights. The ML service may be unavailable.
          </span>
        ) : null}

        {!isLoading && !isError && sectionEntries.length > 0 ? (
          <div className="dac-insights-sections">
            {sectionEntries.map(([key, label]) => (
              <div key={key} className="dac-insights-row">
                <div className="dac-insights-row-label">
                  {key === "trend" ? (
                    <span
                      className={`dac-insights-trend-indicator ${trendIndicator.className}`}
                      aria-hidden="true"
                    >
                      {trendIndicator.symbol}
                    </span>
                  ) : null}
                  <span>{label}</span>
                </div>
                <p className="dac-insights-row-value">{sections[key]}</p>
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && !isError && sectionEntries.length === 0 && !supported ? (
          <span className="dac-insights-empty">
            AI insights are unavailable for this provider.
          </span>
        ) : null}

        {!isLoading && !isError && sectionEntries.length === 0 && supported ? (
          <span className="dac-insights-empty">
            No data available for the selected period.
          </span>
        ) : null}
      </div>
    </div>
  );
}
