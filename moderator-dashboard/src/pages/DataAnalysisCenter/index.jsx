import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, statsAPI, usersAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  AIInsightsCard,
  CategoryTrendCard,
  FunnelCard,
  HeatmapCard,
  HotspotsCard,
  KpiRow,
  ReporterQualityCard,
  ResponseTimeCards,
  SLACard,
  Tooltip,
} from "./components";
import { useAnalyticsData } from "./hooks/useAnalyticsData";
import "./dac.css";

export default function DataAnalysisCenter() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("30d");
  const [tip, setTip] = useState(null);

  const showTip = (e, title, rows) =>
    setTip({ x: e.clientX + 14, y: e.clientY - 10, title, rows });
  const moveTip = (e) =>
    setTip((t) => (t ? { ...t, x: e.clientX + 14, y: e.clientY - 10 } : t));
  const hideTip = () => setTip(null);

  const {
    data: allIncidents = [],
    isLoading: incLoading,
    isError: incError,
  } = useQuery({
    queryKey: ["dac-incidents"],
    queryFn: async () => {
      const r = await reportsAPI.getAll({ limit: 500 });
      if (!r.success) throw new Error(r.error || "Failed to fetch incidents");
      return r.data || [];
    },
    staleTime: 60000,
    refetchInterval: 30000,
  });

  const { data: allUsers = [], isError: usersError } = useQuery({
    queryKey: ["dac-users"],
    queryFn: async () => {
      const r = await usersAPI.getAll();
      if (!r.success) throw new Error(r.error || "Failed to fetch users");
      return r.data || [];
    },
    staleTime: 120000,
    enabled: user?.role !== "law_enforcement",
  });

  const {
    incidents,
    kpis,
    histogramData,
    histMax,
    percentiles,
    trendLine,
    trendMax,
    trendTotal,
    trendWeeklyAvg,
    trendXLabels,
    peakLabel,
    heatmap,
    heatMax,
    heatPeak,
    funnelData,
    catTrend,
    catMax,
    activeCats,
    catBucketLabels,
    hotspots,
    reporterStats,
  } = useAnalyticsData({ allIncidents, allUsers, period });

  const loading = incLoading && incidents.length === 0;

  const insightsPayload = {
    period,
    total_incidents: incidents.length,
    kpis: {
      avg_response_min: kpis.avgResponse,
      sla_rate: kpis.slaRate,
      sla_compliant: kpis.slaCompliant,
      sla_breached: kpis.slaBreached,
      resolution_rate: kpis.resolutionRate,
      avg_time_to_close_days: Number.parseFloat(kpis.avgTimeToClose),
    },
    top_categories: activeCats.map(([cat, vals]) => [
      cat,
      vals.reduce((sum, value) => sum + value, 0),
    ]),
    top_hotspots: hotspots.map((h) => ({ name: h.name, count: h.count })),
    peak_activity: {
      day: heatPeak.peakDayLabel,
      hour: heatPeak.peakHour,
      count: heatPeak.peakCount,
    },
    funnel: funnelData.map((f) => ({ label: f.label, count: f.count })),
  };

  const {
    data: insightsData,
    isLoading: insightsLoading,
    isError: insightsError,
    dataUpdatedAt: insightsUpdatedAt,
    refetch: refetchInsights,
    isFetching: insightsFetching,
  } = useQuery({
    queryKey: ["dac-insights", period],
    queryFn: async () => {
      const result = await statsAPI.getAIInsights(insightsPayload);
      if (!result.success) {
        throw new Error(result.error || "Failed to generate insights");
      }
      return result.data;
    },
    staleTime: 300000,
    enabled: !loading && incidents.length > 0,
    retry: 1,
  });

  return (
    <>
      <Tooltip tip={tip} />
      <div className="dac" style={{ margin: "-2rem", minHeight: "100vh" }}>
        <div className="dac-topbar">
          <div className="dac-topbar-title">Data Analysis Center</div>
          <div className="dac-topbar-sub">
            {user?.region || "All Regions"} · Analysis View
          </div>
          <div className="dac-topbar-right">
            {["7d", "30d", "90d", "1y"].map((p) => (
              <button
                key={p}
                className={`dac-period-btn${period === p ? " active" : ""}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="dac-scroll">
          {loading && (
            <div className="dac-loading">Loading analytics data…</div>
          )}
          {incError && (
            <div className="dac-error-banner">
              ⚠ Failed to load incident data — analytics may be incomplete.
            </div>
          )}
          {usersError && (
            <div className="dac-error-banner">
              ⚠ Failed to load user data — reporter quality stats unavailable.
            </div>
          )}
          {allIncidents.length >= 500 && (
            <div className="dac-warn-banner">
              ⚠ Showing first 500 incidents — metrics may not reflect the full
              dataset.
            </div>
          )}

          <AIInsightsCard
            insight={insightsData?.insight ?? null}
            supported={insightsData?.supported ?? true}
            isLoading={insightsLoading}
            isError={insightsError}
            generatedAt={insightsUpdatedAt ? new Date(insightsUpdatedAt) : null}
            onRefresh={refetchInsights}
            isRefreshing={insightsFetching && !insightsLoading}
          />

          <KpiRow
            kpis={kpis}
            incidentsCount={incidents.length}
            period={period}
          />

          <ResponseTimeCards
            kpis={kpis}
            histogramData={histogramData}
            histMax={histMax}
            percentiles={percentiles}
            trendLine={trendLine}
            trendMax={trendMax}
            trendTotal={trendTotal}
            trendWeeklyAvg={trendWeeklyAvg}
            trendXLabels={trendXLabels}
            peakLabel={peakLabel}
            period={period}
            showTip={showTip}
            moveTip={moveTip}
            hideTip={hideTip}
          />

          <HeatmapCard
            heatmap={heatmap}
            heatMax={heatMax}
            heatPeak={heatPeak}
            showTip={showTip}
            moveTip={moveTip}
            hideTip={hideTip}
          />

          <div className="dac-section-row">
            <div className="dac-section-title">
              Case Funnel &amp; Resolution
            </div>
            <div className="dac-section-line" />
          </div>
          <div className="dac-grid-3col">
            <FunnelCard
              funnelData={funnelData}
              showTip={showTip}
              moveTip={moveTip}
              hideTip={hideTip}
            />
            <CategoryTrendCard
              activeCats={activeCats}
              catTrend={catTrend}
              catMax={catMax}
              catBucketLabels={catBucketLabels}
              showTip={showTip}
              moveTip={moveTip}
              hideTip={hideTip}
            />
            <SLACard kpis={kpis} />
          </div>

          <div className="dac-section-row">
            <div className="dac-section-title">
              Geographic &amp; Signal Intelligence
            </div>
            <div className="dac-section-line" />
          </div>
          <div className="dac-grid-2">
            <HotspotsCard
              hotspots={hotspots}
              period={period}
              showTip={showTip}
              moveTip={moveTip}
              hideTip={hideTip}
            />
            <ReporterQualityCard
              reporterStats={reporterStats}
              showTip={showTip}
              moveTip={moveTip}
              hideTip={hideTip}
            />
          </div>
        </div>
      </div>
    </>
  );
}
