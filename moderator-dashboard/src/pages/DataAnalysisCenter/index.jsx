import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, usersAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
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

  const { data: allIncidents = [], isLoading: incLoading } = useQuery({
    queryKey: ["dac-incidents"],
    queryFn: async () => {
      const r = await reportsAPI.getAll({ limit: 500 });
      return r.success ? r.data || [] : [];
    },
    staleTime: 60000,
    refetchInterval: 30000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["dac-users"],
    queryFn: async () => {
      const r = await usersAPI.getAll();
      return r.success ? r.data || [] : [];
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
    peakLabel,
    heatmap,
    heatMax,
    heatPeak,
    funnelData,
    catTrend,
    catMax,
    activeCats,
    hotspots,
    reporterStats,
  } = useAnalyticsData({ allIncidents, allUsers, period });

  const loading = incLoading && incidents.length === 0;

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
            peakLabel={peakLabel}
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
