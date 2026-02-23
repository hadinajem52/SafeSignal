export default function FunnelCard({ funnelData, showTip, moveTip, hideTip }) {
  return (
    <div className="dac-card">
      <div className="dac-card-header">
        <div className="dac-card-title">Case Resolution Funnel</div>
        <div className="dac-card-meta">Where cases stall</div>
      </div>
      <div className="dac-funnel-list">
        {funnelData.map((f, i) => {
          const prev = i > 0 ? funnelData[i - 1].count : null;
          const drop = prev && prev > 0 ? (((prev - f.count) / prev) * 100).toFixed(0) : null;
          const funnelPct =
            funnelData[0].count > 0 ? ((f.count / funnelData[0].count) * 100).toFixed(0) : 0;
          return (
            <div
              key={f.label}
              className="dac-funnel-row"
              onMouseEnter={(e) =>
                showTip(e, `Funnel: ${f.label}`, [
                  { dot: f.color, label: "Cases", value: f.count },
                  { dot: f.color, label: "Of total", value: `${funnelPct}%` },
                  ...(drop
                    ? [{ divider: true }, { label: "Drop from prev", value: `−${drop}%`, color: "var(--dac-red)" }]
                    : []),
                ])
              }
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            >
              <div className="dac-funnel-label">{f.label}</div>
              <div className="dac-funnel-track">
                <div
                  className="dac-funnel-fill"
                  style={{
                    width: `${funnelData[0].count > 0 ? (f.count / funnelData[0].count) * 100 : 0}%`,
                    background: f.color,
                    opacity: 0.8,
                  }}
                />
              </div>
              <div className="dac-funnel-count">{f.count}</div>
              <div className="dac-funnel-pct">{funnelPct}%</div>
              <div className="dac-funnel-drop">
                {drop ? <span style={{ color: "var(--dac-red)" }}>−{drop}%</span> : <span style={{ color: "var(--dac-muted)" }}>—</span>}
              </div>
            </div>
          );
        })}
      </div>
      {(() => {
        const verified = funnelData[1]?.count || 0;
        const dispatched = funnelData[2]?.count || 0;
        const dropPct = verified > 0 ? (((verified - dispatched) / verified) * 100).toFixed(0) : 0;
        return (
          verified > 0 && (
            <div className="dac-alert-footer">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--dac-amber)"
                strokeWidth="2"
                style={{ marginTop: 1, flexShrink: 0 }}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--dac-amber)" }}>
                {dropPct}% drop from Verified → Dispatched — investigate backlog
              </span>
            </div>
          )
        );
      })()}
    </div>
  );
}
