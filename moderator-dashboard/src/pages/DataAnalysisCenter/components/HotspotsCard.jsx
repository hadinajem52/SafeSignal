export default function HotspotsCard({ hotspots, period, showTip, moveTip, hideTip }) {
  return (
    <div className="dac-card">
      <div className="dac-card-header">
        <div className="dac-card-title">Repeat Incident Hotspots</div>
        <div className="dac-card-meta">{hotspots.length} locations</div>
      </div>
      {hotspots.length === 0 ? (
        <div className="dac-loading" style={{ height: 120 }}>
          No location data available
        </div>
      ) : (
        hotspots.map((h, i) => {
          const barColor =
            h.count >= 8 ? "var(--dac-red)" : h.count >= 5 ? "var(--dac-amber)" : "var(--dac-blue)";
          const tier = h.count >= 8 ? "Critical hotspot" : h.count >= 5 ? "Active hotspot" : "Low activity";
          return (
            <div
              key={i}
              className="dac-hotspot-row"
              onMouseEnter={(e) =>
                showTip(e, `#${i + 1} Hotspot`, [
                  { label: "Location", value: h.name },
                  { divider: true },
                  { dot: barColor, label: "Incidents", value: h.count },
                  { dot: barColor, label: "Relative volume", value: `${h.pct}%` },
                  { dot: barColor, label: "Tier", value: tier, color: barColor },
                ])
              }
              onMouseMove={moveTip}
              onMouseLeave={hideTip}
            >
              <div className="dac-hotspot-rank">{i + 1}</div>
              <div className="dac-hotspot-name">
                <div className="dac-hotspot-title">{h.name}</div>
              </div>
              <div className="dac-hotspot-bar">
                <div className="dac-hotspot-track">
                  <div className="dac-hotspot-fill" style={{ width: `${h.pct}%`, background: barColor }} />
                </div>
              </div>
              <div className="dac-hotspot-count">{h.count}</div>
            </div>
          );
        })
      )}
      <div className="dac-info-footer">Incident count over last {period} · Red = recurring hotspot</div>
    </div>
  );
}
