import { heatColor } from "./helpers";
import { DAYS_LABELS } from "./constants";

export default function HeatmapCard({
  heatmap,
  heatMax,
  heatPeak,
  showTip,
  moveTip,
  hideTip,
}) {
  return (
    <>
      <div className="dac-section-row">
        <div className="dac-section-title">Incident Heatmap</div>
        <div className="dac-section-line" />
        <div className="dac-section-meta">Hour × Day — incident frequency</div>
      </div>
      <div className="dac-card" style={{ marginBottom: 20 }}>
        <div className="dac-card-header">
          <div className="dac-card-title">Peak Incident Hours by Day of Week</div>
          <div
            className="dac-card-meta"
            style={{ color: "var(--dac-amber)", fontWeight: 700 }}
          >
            ↑ Peak: {heatPeak.peakDayLabel}{" "}
            {String(heatPeak.peakHour).padStart(2, "0")}:00 ({heatPeak.peakCount} incidents)
          </div>
        </div>
        <div className="dac-heatmap-grid">
          {heatmap.map((row, di) => (
            <>
              <div key={`lbl-${di}`} className="dac-hm-row-label">
                {DAYS_LABELS[di]}
              </div>
              {row.map((val, hi) => (
                <div
                  key={`${di}-${hi}`}
                  className="dac-hm-cell"
                  style={{ background: heatColor(val, heatMax) }}
                  onMouseEnter={(e) =>
                    showTip(e, "Incident Heatmap", [
                      { label: "Day", value: DAYS_LABELS[di] },
                      {
                        label: "Hour",
                        value: `${String(hi).padStart(2, "0")}:00 – ${String(hi + 1).padStart(2, "0")}:00`,
                      },
                      { divider: true },
                      {
                        dot:
                          heatColor(val, heatMax) === "var(--dac-surface2)"
                            ? "#3D4F65"
                            : heatColor(val, heatMax),
                        label: "Incidents",
                        value: val,
                      },
                      {
                        label: "% of daily peak",
                        value: heatMax > 0 ? `${((val / heatMax) * 100).toFixed(0)}%` : "—",
                      },
                    ])
                  }
                  onMouseMove={moveTip}
                  onMouseLeave={hideTip}
                />
              ))}
            </>
          ))}
        </div>
        <div className="dac-hm-hour-row">
          <div />
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="dac-hm-hour-label">
              {i % 6 === 0 ? String(i).padStart(2, "0") : ""}
            </div>
          ))}
        </div>
        <div className="dac-hm-legend">
          <div className="dac-hm-legend-label">Low</div>
          <div className="dac-legend-scale">
            {[
              "rgba(59,158,255,0.15)",
              "rgba(59,158,255,0.4)",
              "rgba(245,166,35,0.5)",
              "rgba(229,72,77,0.7)",
            ].map((c, i) => (
              <div key={i} className="dac-legend-cell" style={{ background: c }} />
            ))}
          </div>
          <div className="dac-hm-legend-label">High</div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--dac-dim)",
            }}
          >
            Use to schedule patrol coverage
          </div>
        </div>
      </div>
    </>
  );
}
