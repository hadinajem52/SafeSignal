import { CAT_DISPLAY } from "../../../constants/categoryConfig";

export default function CategoryTrendCard({
  activeCats,
  catTrend,
  catMax,
  catBucketLabels,
  showTip,
  moveTip,
  hideTip,
}) {
  return (
    <div className="dac-card">
      <div className="dac-card-header">
        <div className="dac-card-title">Incidents by Category</div>
        <div className="dac-card-meta">{catBucketLabels.length} rolling windows</div>
      </div>
      <div style={{ padding: "16px 16px 0" }}>
        <div className="dac-cat-bars">
          {catBucketLabels.map((wkLabel, wk) => (
            <div key={wk} className="dac-cat-group">
              {activeCats.map(([cat]) => {
                const count = catTrend[cat][wk];
                const catColor = CAT_DISPLAY[cat]?.color || "var(--dac-muted)";
                return (
                  <div
                    key={cat}
                    className="dac-cat-seg"
                    style={{
                      height: `${catMax > 0 ? (count / catMax) * 100 : 0}%`,
                      background: catColor,
                      opacity: 0.85,
                      minHeight: count > 0 ? 2 : 0,
                    }}
                    onMouseEnter={(e) =>
                      showTip(e, `${CAT_DISPLAY[cat]?.label || cat} — ${wkLabel}`, [
                        { dot: catColor, label: "Incidents", value: count },
                        {
                          label: "% of week peak",
                          value: catMax > 0 ? `${((count / catMax) * 100).toFixed(0)}%` : "—",
                        },
                      ])
                    }
                    onMouseMove={moveTip}
                    onMouseLeave={hideTip}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="dac-cat-xlabels">
        {catBucketLabels.map((w) => (
          <div key={w} className="dac-cat-xlabel">
            {w}
          </div>
        ))}
      </div>
      <div className="dac-cat-legend">
        {activeCats.length === 0 ? (
          <div style={{ fontSize: 10, color: "var(--dac-muted)" }}>No category data in range</div>
        ) : (
          activeCats.map(([cat]) => (
            <div key={cat} className="dac-cat-legend-item">
              <div
                className="dac-cat-legend-dot"
                style={{ background: CAT_DISPLAY[cat]?.color || "var(--dac-muted)" }}
              />
              {CAT_DISPLAY[cat]?.label || cat}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
