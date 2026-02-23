export default function ReporterQualityCard({ reporterStats, showTip, moveTip, hideTip }) {
  return (
    <div className="dac-card">
      <div className="dac-card-header">
        <div className="dac-card-title">Reporter Signal Quality</div>
        <div className="dac-card-meta">Valid reports / total submitted</div>
      </div>
      {reporterStats.length === 0 ? (
        <div className="dac-loading" style={{ height: 120 }}>
          Insufficient data (min 2 reports per reporter)
        </div>
      ) : (
        reporterStats.map((r, i) => {
          const grade =
            r.pct >= 75 ? "High quality" : r.pct >= 40 ? "Moderate quality" : "Low quality — review";
          return (
            <div
              key={i}
              className="dac-reporter-row"
              onMouseEnter={(e) =>
                showTip(e, r.name, [
                  { dot: r.color, label: "Accuracy", value: `${r.pct}%`, color: r.color },
                  { label: "Valid reports", value: r.valid },
                  { label: "Total submitted", value: r.total },
                  { divider: true },
                  { dot: r.color, label: "Signal quality", value: grade, color: r.color },
                ])
              }
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            >
              <div className="dac-reporter-avatar">{r.initials}</div>
              <div>
                <div className="dac-reporter-name">{r.name}</div>
                <div className="dac-reporter-sub">
                  {r.valid}/{r.total} valid
                </div>
              </div>
              <div className="dac-quality-bar" style={{ marginLeft: "auto" }}>
                <div className="dac-quality-track">
                  <div className="dac-quality-fill" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
              </div>
              <div className="dac-reporter-stat" style={{ marginLeft: 10 }}>
                <div className="dac-reporter-pct" style={{ color: r.color }}>
                  {r.pct}%
                </div>
                <div className="dac-reporter-label">accuracy</div>
              </div>
            </div>
          );
        })
      )}
      {reporterStats.some((r) => r.pct === 0) && (
        <div className="dac-alert-footer">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--dac-red)"
            strokeWidth="2"
            style={{ marginTop: 1, flexShrink: 0 }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--dac-dim)", lineHeight: 1.5 }}>
            {reporterStats.filter((r) => r.pct === 0).length} reporter(s) with 0% accuracy — flag for manual
            review.
          </span>
        </div>
      )}
    </div>
  );
}
