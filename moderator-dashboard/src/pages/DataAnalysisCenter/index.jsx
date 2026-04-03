import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, statsAPI, usersAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { ACTIONED_STATUSES } from "../../constants/incidentStatuses";
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
import { diffMinutes, getPeriodMs } from "./components/helpers";
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
  const periodMs = getPeriodMs(period);
  const periodMinutes = periodMs / 60000;
  const now = Date.now();
  const prevIncidents = allIncidents.filter((incident) => {
    if (incident.is_draft) return false;
    const createdAt = new Date(incident.created_at).getTime();
    return createdAt >= now - 2 * periodMs && createdAt < now - periodMs;
  });

  const prevResponseTimes = prevIncidents
    .filter((incident) => ACTIONED_STATUSES.has(incident.status))
    .map((incident) => diffMinutes(incident.created_at, incident.updated_at))
    .filter((minutes) => minutes > 0 && minutes < periodMinutes);
  const prevSlaCompliant = prevResponseTimes.filter(
    (minutes) => minutes <= 30,
  ).length;
  const prevSlaRate =
    prevResponseTimes.length > 0
      ? Math.round((prevSlaCompliant / prevResponseTimes.length) * 100)
      : 0;

  const buildCategoryCounts = (items) => {
    const counts = {};
    items.forEach((incident) => {
      const category = incident.category || "unknown";
      counts[category] = (counts[category] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  };

  const currentCategoryCounts = buildCategoryCounts(incidents);
  const prevCategoryCounts = buildCategoryCounts(prevIncidents);
  const [topCategoryName, topCategoryCount] = currentCategoryCounts[0] || [null, 0];
  const prevTopCategoryName = prevCategoryCounts[0]?.[0] || null;
  const prevMatchingCategoryCount = topCategoryName
    ? prevCategoryCounts.find(([category]) => category === topCategoryName)?.[1] || 0
    : 0;
  const categoryDelta = topCategoryName
    ? {
        category: topCategoryName,
        current_count: topCategoryCount,
        prev_count: prevMatchingCategoryCount,
        pct_change:
          prevMatchingCategoryCount > 0
            ? Number.parseFloat(
                (
                  ((topCategoryCount - prevMatchingCategoryCount) /
                    prevMatchingCategoryCount) *
                  100
                ).toFixed(1),
              )
            : topCategoryCount > 0
              ? 100
              : 0,
      }
    : null;

  const topHotspotPayload = Object.entries(
    incidents.reduce((counts, incident) => {
      const locationName = incident.location_name || "Unknown";
      counts[locationName] = (counts[locationName] || 0) + 1;
      return counts;
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const midpoint = Math.ceil(trendLine.length / 2);
  const firstHalfTotal = trendLine
    .slice(0, midpoint)
    .reduce((sum, value) => sum + value, 0);
  const secondHalfTotal = trendLine
    .slice(midpoint)
    .reduce((sum, value) => sum + value, 0);
  const trendDirection =
    secondHalfTotal > firstHalfTotal
      ? "rising"
      : secondHalfTotal < firstHalfTotal
        ? "falling"
        : "stable";

  const p75Metric = percentiles[2];
  const p75ResponseMinutes = p75Metric
    ? Number.parseFloat(p75Metric.val) * (p75Metric.unit === "hr" ? 60 : 1)
    : null;
  const prevPeriod =
    prevIncidents.length > 0
      ? {
          total_incidents: prevIncidents.length,
          sla_rate: prevSlaRate,
          top_category: prevTopCategoryName,
        }
      : null;

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
    top_categories: currentCategoryCounts.slice(0, 6),
    top_hotspots: topHotspotPayload,
    peak_activity: {
      day: heatPeak.peakDayLabel,
      hour: heatPeak.peakHour,
      count: heatPeak.peakCount,
    },
    funnel: funnelData.map((f) => ({ label: f.label, count: f.count })),
    prev_period: prevPeriod,
    trend_direction: trendDirection,
    p75_response_min: p75ResponseMinutes,
    category_delta: categoryDelta,
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
      <div className="dac" style={{ height: "100%", minHeight: 0 }}>
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
            sections={insightsData?.sections ?? null}
            trendDirection={trendDirection}
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
