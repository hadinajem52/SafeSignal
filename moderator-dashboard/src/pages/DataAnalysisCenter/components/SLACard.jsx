import SLAGauge from "./SLAGauge";

export default function SLACard({ kpis }) {
  const actionedCount = kpis.actionedCount ?? kpis.responseTimes?.length ?? 0;
  const hasResponseSample = actionedCount > 0;

  return (
    <div className="dac-card">
      <div className="dac-card-header">
        <div className="dac-card-title">SLA Compliance</div>
        <div className="dac-card-meta">30-min action target</div>
      </div>
      <div className="dac-sla-center">
        <SLAGauge pct={hasResponseSample ? kpis.slaRate : 0} />
        <div className="dac-sla-pct">{hasResponseSample ? `${kpis.slaRate}%` : "—"}</div>
        <div className="dac-sla-sub">
          {hasResponseSample
            ? "of verified cases actioned within 30 min"
            : "waiting for first-action timestamps"}
        </div>
      </div>
      <div className="dac-sla-breakdown">
        {[
          { label: "Within SLA", value: kpis.slaCompliant, color: "var(--dac-green)" },
          { label: "Breached SLA", value: kpis.slaBreached, color: "var(--dac-red)" },
          {
            label: "Avg Response",
            value:
              kpis.avgResponse >= 60
                ? `${(kpis.avgResponse / 60).toFixed(1)}h`
                : kpis.avgResponse === null || kpis.avgResponse === undefined
                  ? "—"
                  : `${kpis.avgResponse}m`,
            color: "var(--dac-amber)",
          },
          { label: "Cases Sampled", value: actionedCount, color: "var(--dac-blue)" },
        ].map((s) => (
          <div key={s.label} className="dac-sla-cell">
            <div className="dac-sla-cell-label">{s.label}</div>
            <div className="dac-sla-cell-val" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
