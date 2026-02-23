import TrendLine from "./TrendLine";

export default function ResponseTimeCards({
  kpis,
  histogramData,
  histMax,
  percentiles,
  trendLine,
  trendMax,
  trendTotal,
  peakLabel,
  showTip,
  moveTip,
  hideTip,
}) {
  return (
    <>
      <div className="dac-section-row">
        <div className="dac-section-title">Response Time Distribution</div>
        <div className="dac-section-line" />
        <div className="dac-section-meta">Cases by time-to-dispatch</div>
      </div>
      <div className="dac-grid-2">
        <div className="dac-card">
          <div className="dac-card-header">
            <div className="dac-card-title">Time-to-Dispatch Histogram</div>
            <div className="dac-card-meta">
              {kpis.responseTimes.length} actioned cases
            </div>
          </div>
          <div style={{ padding: "16px 16px 0" }}>
            <div className="dac-bars">
              {histogramData.map((b, i) => (
                <div
                  key={i}
                  className="dac-bar"
                  style={{
                    height: `${(b.count / histMax) * 100}%`,
                    background: b.color,
                    opacity: 0.85,
                    minHeight: b.count > 0 ? 3 : 0,
                  }}
                  onMouseEnter={(e) =>
                    showTip(e, "Response Time Bucket", [
                      { dot: b.color, label: "Range", value: b.label },
                      { dot: b.color, label: "Cases", value: b.count },
                      {
                        dot: b.color,
                        label: "% of actioned",
                        value:
                          kpis.responseTimes.length > 0
                            ? `${((b.count / kpis.responseTimes.length) * 100).toFixed(1)}%`
                            : "—",
                      },
                    ])
                  }
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0 8px",
                marginTop: 4,
              }}
            >
              {histogramData.map((b, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: 8,
                    fontWeight: 700,
                    color: "var(--dac-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {b.label}
                </div>
              ))}
            </div>
          </div>
          <div className="dac-pct-row">
            {percentiles.map((p) => (
              <div
                key={p.label}
                className="dac-pct-item"
                style={{ cursor: "default" }}
                onMouseEnter={(e) =>
                  showTip(e, `${p.label} Percentile`, [
                    {
                      dot: p.color,
                      label: "Value",
                      value: `${p.val} ${p.unit}`,
                    },
                    { label: "Meaning", value: `${p.fill}% of cases under this` },
                  ])
                }
                onMouseMove={moveTip}
                onMouseLeave={hideTip}
              >
                <div className="dac-pct-label">{p.label}</div>
                <div className="dac-pct-val">
                  {p.val}
                  <span className="dac-pct-unit">{p.unit}</span>
                </div>
                <div className="dac-pct-bar">
                  <div
                    className="dac-pct-fill"
                    style={{ width: `${p.fill}%`, background: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="dac-card">
          <div className="dac-card-header">
            <div className="dac-card-title">30-Day Incident Trend</div>
            <div className="dac-card-meta">Daily total reports</div>
          </div>
          <TrendLine
            data={trendLine}
            color="var(--dac-blue)"
            maxVal={trendMax}
            height={96}
            showTip={showTip}
            moveTip={moveTip}
            hideTip={hideTip}
          />
          <div className="dac-trend-xlabels">
            {["1", "5", "10", "15", "20", "25", "30"].map((d) => (
              <span key={d} className="dac-trend-xlabel">
                {d}
              </span>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 1,
              background: "var(--dac-border)",
              borderTop: "1px solid var(--dac-border)",
            }}
          >
            {[
              { label: "Peak Day", value: peakLabel, color: "var(--dac-amber)" },
              { label: "Total", value: trendTotal, color: "var(--dac-blue)" },
              {
                label: "Weekly Avg",
                value: (trendTotal / 4).toFixed(1),
                color: "var(--dac-green)",
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{ background: "var(--dac-surface)", padding: "10px 14px" }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--dac-muted)",
                    marginBottom: 3,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: s.color,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
