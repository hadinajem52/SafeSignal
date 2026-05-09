export default function KpiRow({ kpis, incidentsCount, period }) {
  const hasResponseSample = kpis.avgResponse !== null && kpis.avgResponse !== undefined;
  const hasCloseSample = kpis.avgTimeToClose !== null && kpis.avgTimeToClose !== undefined;

  return (
    <>
      <div className="dac-section-row">
        <div className="dac-section-title">Key Performance Indicators</div>
        <div className="dac-section-line" />
        <div className="dac-section-meta">
          Last {period} · {incidentsCount} reports
        </div>
      </div>
      <div className="dac-grid-4">
        <div className="dac-kpi blue">
          <div className="dac-kpi-label">Avg. Response Time</div>
          <div className="dac-kpi-value">
            {!hasResponseSample ? (
              "—"
            ) : kpis.avgResponse >= 60 ? (
              <>
                {(kpis.avgResponse / 60).toFixed(1)}
                <sup>hr</sup>
              </>
            ) : (
              <>
                {kpis.avgResponse}
                <sup>min</sup>
              </>
            )}
          </div>
          <div
            className={`dac-kpi-delta ${!hasResponseSample ? "dac-delta-neu" : kpis.avgResponse <= 30 ? "dac-delta-good" : "dac-delta-bad"}`}
          >
            {!hasResponseSample
              ? "No first-action samples"
              : kpis.avgResponse <= 30
              ? "↓ Within SLA target"
              : "↑ Above 30-min SLA target"}
          </div>
        </div>
        <div className="dac-kpi green">
          <div className="dac-kpi-label">SLA Compliance</div>
          <div className="dac-kpi-value">
            {hasResponseSample ? (
              <>
                {kpis.slaRate}
                <sup>%</sup>
              </>
            ) : (
              "—"
            )}
          </div>
          <div
            className={`dac-kpi-delta ${!hasResponseSample ? "dac-delta-neu" : kpis.slaRate >= 80 ? "dac-delta-good" : kpis.slaRate >= 60 ? "dac-delta-neu" : "dac-delta-bad"}`}
          >
            {hasResponseSample
              ? `${kpis.slaCompliant} within · ${kpis.slaBreached} breached`
              : "No first-action samples"}
          </div>
        </div>
        <div className="dac-kpi amber">
          <div className="dac-kpi-label">Case Resolution Rate</div>
          <div className="dac-kpi-value">
            {kpis.resolutionRate}
            <sup>%</sup>
          </div>
          <div
            className={`dac-kpi-delta ${kpis.resolutionRate >= 50 ? "dac-delta-good" : "dac-delta-bad"}`}
          >
            {kpis.closedCount} of {incidentsCount} closed
          </div>
        </div>
        <div className="dac-kpi red">
          <div className="dac-kpi-label">Avg. Time to Close</div>
          <div className="dac-kpi-value">
            {hasCloseSample ? (
              <>
                {kpis.avgTimeToClose}
                <sup>d</sup>
              </>
            ) : (
              "—"
            )}
          </div>
          <div className="dac-kpi-delta dac-delta-neu">
            {hasCloseSample
              ? `${kpis.closeDurationCount ?? kpis.closedCount} cases with close timestamp`
              : "No close-time samples"}
          </div>
        </div>
      </div>
    </>
  );
}
