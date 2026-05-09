import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { statsAPI } from "../../services/api";
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
import "./dac.css";

const EMPTY_ANALYTICS = {
  incidentsCount: 0,
  kpis: {
    avgResponse: 0,
    slaRate: 0,
    resolutionRate: 0,
    avgTimeToClose: "0",
    responseTimes: [],
    actionedCount: 0,
    slaCompliant: 0,
    slaBreached: 0,
    closedCount: 0,
  },
  histogramData: [],
  histMax: 1,
  percentiles: [],
  trendLine: [],
  trendMax: 1,
  trendTotal: 0,
  trendWeeklyAvg: "0.0",
  trendXLabels: [],
  peakLabel: "—",
  heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
  heatMax: 1,
  heatPeak: { peakDow: 0, peakHour: 0, peakCount: 0, peakDayLabel: "Mon" },
  funnelData: [],
  catTrend: {},
  catMax: 1,
  activeCats: [],
  catBucketLabels: [],
  hotspots: [],
  reporterStats: [],
  insightsPayload: null,
};

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
    data: analytics = EMPTY_ANALYTICS,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = useQuery({
    queryKey: ["dac-analytics", period],
    queryFn: async () => {
      const r = await statsAPI.getDacAnalytics({ period });
      if (!r.success) throw new Error(r.error || "Failed to fetch analytics");
      return r.data || EMPTY_ANALYTICS;
    },
    staleTime: 60000,
    refetchInterval: 30000,
  });

  const {
    incidentsCount,
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
    insightsPayload,
  } = analytics;

  const loading = analyticsLoading && incidentsCount === 0;
  const trendDirection = insightsPayload?.trend_direction || "stable";

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
    enabled: !loading && incidentsCount > 0 && Boolean(insightsPayload),
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
          {analyticsError && (
            <div className="dac-error-banner">
              ⚠ Failed to load analytics data.
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
            incidentsCount={incidentsCount}
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
