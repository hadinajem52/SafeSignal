import { useMemo } from "react";
import { filterByPeriod, diffMinutes } from "../components/helpers";
import { HIST_BUCKETS, DAYS_LABELS } from "../components/constants";
import {
  ACTIONED_STATUSES,
  CLOSED_STATUSES,
  FUNNEL_STAGES,
} from "../../../constants/incidentStatuses";
import { CAT_DISPLAY } from "../../../constants/categoryConfig";

export function useAnalyticsData({ allIncidents, allUsers, period }) {
  const incidents = useMemo(
    () =>
      filterByPeriod(
        allIncidents.filter((i) => !i.is_draft),
        period,
      ),
    [allIncidents, period],
  );

  const kpis = useMemo(() => {
    const actioned = incidents.filter((i) => ACTIONED_STATUSES.has(i.status));
    const closed = incidents.filter((i) => CLOSED_STATUSES.has(i.status));
    const responseTimes = actioned
      .map((i) => diffMinutes(i.created_at, i.updated_at))
      .filter((m) => m > 0 && m < 10080)
      .sort((a, b) => a - b);
    const avgResponse =
      responseTimes.length > 0
        ? responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length
        : 0;
    const SLA_MINUTES = 30;
    const slaCompliant = responseTimes.filter((m) => m <= SLA_MINUTES).length;
    const slaRate =
      responseTimes.length > 0
        ? Math.round((slaCompliant / responseTimes.length) * 100)
        : 0;
    const resolutionRate =
      incidents.length > 0
        ? Math.round((closed.length / incidents.length) * 100)
        : 0;
    const closedTimes = closed
      .map((i) => diffMinutes(i.created_at, i.updated_at) / 1440)
      .filter((d) => d > 0);
    const avgTimeToClose =
      closedTimes.length > 0
        ? (closedTimes.reduce((s, v) => s + v, 0) / closedTimes.length).toFixed(
            1,
          )
        : "0";
    return {
      avgResponse: Math.round(avgResponse),
      slaRate,
      resolutionRate,
      avgTimeToClose,
      responseTimes,
      slaCompliant,
      slaBreached: responseTimes.length - slaCompliant,
      closedCount: closed.length,
    };
  }, [incidents]);

  const histogramData = useMemo(() => {
    const counts = HIST_BUCKETS.map(() => 0);
    kpis.responseTimes.forEach((m) => {
      const idx = HIST_BUCKETS.findIndex((b, i) => {
        const prev = i === 0 ? 0 : HIST_BUCKETS[i - 1].max;
        return m >= prev && m < b.max;
      });
      if (idx >= 0) counts[idx]++;
    });
    return HIST_BUCKETS.map((b, i) => ({ ...b, count: counts[i] }));
  }, [kpis.responseTimes]);

  const histMax = useMemo(
    () => Math.max(...histogramData.map((b) => b.count), 1),
    [histogramData],
  );

  const percentiles = useMemo(() => {
    const rt = [...kpis.responseTimes];
    const p = (pct) =>
      rt.length === 0 ? 0 : rt[Math.floor((pct / 100) * (rt.length - 1))];
    const fmt = (m) =>
      m >= 60
        ? { val: (m / 60).toFixed(1), unit: "hr" }
        : { val: Math.round(m), unit: "min" };
    return [
      { label: "P25", ...fmt(p(25)), color: "var(--dac-green)", fill: 25 },
      { label: "P50", ...fmt(p(50)), color: "var(--dac-blue)", fill: 50 },
      { label: "P75", ...fmt(p(75)), color: "var(--dac-amber)", fill: 75 },
      { label: "P90", ...fmt(p(90)), color: "var(--dac-red)", fill: 90 },
    ];
  }, [kpis.responseTimes]);

  const trendLine = useMemo(() => {
    const days = 30;
    const now = Date.now();
    return Array.from({ length: days }, (_, i) => {
      const dayStart = now - (days - i) * 86400000;
      return allIncidents.filter((inc) => {
        const t = new Date(inc.created_at).getTime();
        return t >= dayStart && t < dayStart + 86400000 && !inc.is_draft;
      }).length;
    });
  }, [allIncidents]);

  const trendMax = useMemo(() => Math.max(...trendLine, 1), [trendLine]);

  const trendTotal = useMemo(
    () => trendLine.reduce((sum, value) => sum + value, 0),
    [trendLine],
  );

  const trendPeakIdx = useMemo(
    () => trendLine.indexOf(Math.max(...trendLine)),
    [trendLine],
  );

  const peakLabel = useMemo(() => {
    const peakDate = new Date(Date.now() - (29 - trendPeakIdx) * 86400000);
    return peakDate.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
    });
  }, [trendPeakIdx]);

  const heatmap = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    incidents.forEach((inc) => {
      const d = new Date(inc.created_at);
      grid[(d.getDay() + 6) % 7][d.getHours()]++;
    });
    return grid;
  }, [incidents]);

  const heatMax = useMemo(() => Math.max(...heatmap.flat(), 1), [heatmap]);

  const heatPeak = useMemo(() => {
    let peakDow = 0;
    let peakHour = 0;
    let peakCount = 0;
    heatmap.forEach((row, d) =>
      row.forEach((v, h) => {
        if (v > peakCount) {
          peakCount = v;
          peakDow = d;
          peakHour = h;
        }
      }),
    );
    return {
      peakDow,
      peakHour,
      peakCount,
      peakDayLabel: DAYS_LABELS[peakDow],
    };
  }, [heatmap]);

  const funnelData = useMemo(
    () =>
      FUNNEL_STAGES.map((s) => ({
        ...s,
        count: incidents.filter((i) => s.match(i.status)).length,
      })),
    [incidents],
  );

  const catTrend = useMemo(() => {
    const cats = Object.keys(CAT_DISPLAY);
    const now = Date.now();
    const data = {};
    cats.forEach((cat) => {
      data[cat] = [3, 2, 1, 0].map((w) => {
        const end = now - w * 7 * 86400000;
        const start = end - 7 * 86400000;
        return allIncidents.filter((i) => {
          const t = new Date(i.created_at).getTime();
          return i.category === cat && t >= start && t < end && !i.is_draft;
        }).length;
      });
    });
    return data;
  }, [allIncidents]);

  const catMax = useMemo(
    () => Math.max(...Object.values(catTrend).flat(), 1),
    [catTrend],
  );

  const activeCats = useMemo(
    () =>
      Object.entries(catTrend)
        .filter(([, values]) => values.some((x) => x > 0))
        .slice(0, 6),
    [catTrend],
  );

  const hotspots = useMemo(() => {
    const map = {};
    incidents.forEach((i) => {
      const loc = i.location_name || "Unknown";
      map[loc] = (map[loc] || 0) + 1;
    });
    const sorted = Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const maxC = sorted[0]?.[1] || 1;
    return sorted.map(([name, count]) => ({
      name: name.length > 30 ? name.slice(0, 28) + "…" : name,
      count,
      pct: Math.round((count / maxC) * 100),
    }));
  }, [incidents]);

  const reporterStats = useMemo(() => {
    const userMap = {};
    allUsers.forEach((u) => {
      userMap[u.user_id] = u;
    });
    const map = {};
    incidents.forEach((i) => {
      if (!i.reporter_id) return;
      if (!map[i.reporter_id]) map[i.reporter_id] = { total: 0, valid: 0 };
      map[i.reporter_id].total++;
      if (ACTIONED_STATUSES.has(i.status)) map[i.reporter_id].valid++;
    });
    return Object.entries(map)
      .filter(([, s]) => s.total >= 2)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5)
      .map(([id, s]) => {
        const u = userMap[id];
        const pct = Math.round((s.valid / s.total) * 100);
        const name = u ? u.username || `User #${id}` : `Reporter #${id}`;
        return {
          id,
          name,
          initials: name.slice(0, 2).toUpperCase(),
          total: s.total,
          valid: s.valid,
          pct,
          color:
            pct >= 75
              ? "var(--dac-green)"
              : pct >= 40
                ? "var(--dac-amber)"
                : "var(--dac-red)",
        };
      });
  }, [incidents, allUsers]);

  return {
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
  };
}
