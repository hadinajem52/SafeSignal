import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, statsAPI } from "../services/api";
import { getTimeAgo } from "../utils/dateUtils";
import GoogleMapPanel from "../components/GoogleMapPanel";
import LoadingState from "../components/LoadingState";
import { getStatusCfg } from "../constants/incidentStatuses";
import { CAT_COLORS } from "../constants/categoryConfig";
import "./dashboard.css";

/* ─── SVG icons ──────────────────────────────────────────────────────────── */
const IC = {
  report: (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  clock: (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  check: (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  user: (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  users: (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  shield: (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  arrow: (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};
/* ─── Feed classifier ────────────────────────────────────────────────────── */
function incidentToFeedItem(incident) {
  const st = incident.status;
  let action, dot;
  if (st === "rejected") {
    action = "Report rejected";
    dot = "#E5484D";
  } else if (st === "verified") {
    action = "Report verified";
    dot = "#30A46C";
  } else if (st === "dispatched" || st === "on_scene") {
    action = "Unit dispatched";
    dot = "#3B9EFF";
  } else if (st === "submitted") {
    action = "New report submitted";
    dot = "#F5A623";
  } else if (st === "police_closed") {
    action = "Report closed";
    dot = "#30A46C";
  } else {
    action = "Report updated";
    dot = "#3D4F65";
  }
  const loc = incident.location_name || incident.area_name || "";
  const title = incident.title
    ? `${incident.title}${loc ? " · " + loc : ""}`
    : loc;
  return {
    action,
    sub: `${title ? title + " · " : ""}${getTimeAgo(incident.created_at)}`,
    dot,
  };
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
function Dashboard() {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const result = await statsAPI.getDashboardStats();
      if (result.success) return result.data;
      throw new Error(result.error);
    },
    retry: 1,
  });

  const { data: allIncidents = [] } = useQuery({
    queryKey: ["dashboard-all-incidents"],
    queryFn: async () => {
      const result = await reportsAPI.getAll({ limit: 200 });
      return result.success ? result.data || [] : [];
    },
  });

  /* ── Derived data ──────────────────────────────────────────────────── */
  const mapMarkers = useMemo(() => {
    const active = new Set([
      "submitted",
      "in_review",
      "verified",
      "dispatched",
      "on_scene",
      "investigating",
      "needs_info",
      "auto_processed",
      "auto_flagged",
    ]);
    return allIncidents
      .filter((i) => active.has(i.status))
      .filter(
        (i) =>
          Number.isFinite(Number(i.latitude)) &&
          Number.isFinite(Number(i.longitude)),
      )
      .map((i) => ({
        id: i.incident_id,
        lat: i.latitude,
        lng: i.longitude,
        title: i.title || `Incident #${i.incident_id}`,
        weight:
          i.severity === "critical"
            ? 4
            : i.severity === "high"
              ? 3
              : i.severity === "medium"
                ? 2
                : 1,
      }));
  }, [allIncidents]);

  const criticalCount = useMemo(
    () => allIncidents.filter((i) => i.severity === "critical").length,
    [allIncidents],
  );

  const leDispatchCount = useMemo(
    () =>
      allIncidents.filter((i) =>
        ["dispatched", "on_scene", "investigating"].includes(i.status),
      ).length,
    [allIncidents],
  );

  const categoryBars = useMemo(() => {
    const counts = {};
    allIncidents.forEach((i) => {
      if (i.category) counts[i.category] = (counts[i.category] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([cat, count], idx) => ({
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      count,
      pct: Math.round((count / max) * 100),
      color: CAT_COLORS[idx] || "#3D4F65",
    }));
  }, [allIncidents]);

  const topReporters = useMemo(() => {
    const map = {};
    allIncidents.forEach((i) => {
      const name = i.reporter_username || i.username || "Anonymous";
      if (!map[name]) map[name] = { name, count: 0 };
      map[name].count++;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [allIncidents]);

  const feedItems = useMemo(
    () => (stats?.recentIncidents || []).slice(0, 8).map(incidentToFeedItem),
    [stats],
  );

  /* ── States ────────────────────────────────────────────────────────── */
  if (isLoading) return <LoadingState />;

  if (isError) {
    return (
      <div className="rounded border border-border bg-card p-6">
        <h1 className="text-xl font-bold text-text mb-2">Dashboard</h1>
        <p className="text-error mb-4">
          {error?.message || "Failed to load dashboard stats"}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary hover:opacity-80 text-white font-medium rounded transition-opacity text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const s = stats || {};
  const totalIncidents = s.totalIncidents || 0;
  const pendingReports = s.pendingReports || 0;
  const verifiedReports = s.verifiedReports || 0;
  const rejectedReports = s.rejectedReports || 0;
  const totalUsers = s.totalUsers || 0;
  const activeUsers = s.activeUsers || 0;
  const suspendedUsers = s.suspendedUsers || 0;
  const recentIncidents = s.recentIncidents || [];

  const rejectedPct =
    totalIncidents > 0
      ? Math.round((rejectedReports / totalIncidents) * 100)
      : 0;
  const activeRate =
    totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  return (
    <>
      {/* ── Reports Overview ─────────────────────────────────────────── */}
      <div className="dash-section-row">
        <div className="dash-section-title">Reports Overview</div>
        <div className="dash-section-line" />
        <div className="dash-section-meta">Last 30 days</div>
      </div>

      <div
        className="dash-stat-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        {[
          {
            label: "Total Reports",
            value: totalIncidents,
            accent: "ab-blue",
            icon: IC.report,
            delta: `${totalIncidents} total`,
            deltaClass: "dash-delta-neutral",
          },
          {
            label: "Pending Review",
            value: pendingReports,
            accent: "ab-amber",
            icon: IC.clock,
            delta:
              pendingReports === 0
                ? "Queue clear"
                : `${pendingReports} awaiting`,
            deltaClass:
              pendingReports === 0 ? "dash-delta-down" : "dash-delta-up",
          },
          {
            label: "Verified",
            value: verifiedReports,
            accent: "ab-green",
            icon: IC.check,
            delta: `${totalIncidents > 0 ? Math.round((verifiedReports / totalIncidents) * 100) : 0}% of total`,
            deltaClass: "dash-delta-neutral",
          },
          {
            label: "Rejected",
            value: rejectedReports,
            accent: "ab-red",
            icon: IC.x,
            delta: `${rejectedPct}% of total`,
            deltaClass: "dash-delta-neutral",
          },
        ].map((c) => (
          <div key={c.label} className={`dash-stat-card ${c.accent}`}>
            <div className="dash-stat-top">
              <div className="dash-stat-label">{c.label}</div>
              <div className="dash-stat-icon">{c.icon}</div>
            </div>
            <div className="dash-stat-value">{c.value}</div>
            <div className={`dash-stat-delta ${c.deltaClass}`}>{c.delta}</div>
          </div>
        ))}
      </div>

      {/* ── User Overview ────────────────────────────────────────────── */}
      <div className="dash-section-row">
        <div className="dash-section-title">User Overview</div>
        <div className="dash-section-line" />
      </div>

      <div
        className="dash-stat-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        {[
          {
            label: "Total Users",
            value: totalUsers,
            accent: "ab-muted",
            icon: IC.user,
            delta: `${totalUsers} registered`,
            deltaClass: "dash-delta-neutral",
          },
          {
            label: "Active Users",
            value: activeUsers,
            accent: "ab-green",
            icon: IC.users,
            delta: `${activeRate}% active rate`,
            deltaClass: "dash-delta-down",
          },
          {
            label: "Suspended",
            value: suspendedUsers,
            accent: "ab-red",
            icon: IC.x,
            delta: suspendedUsers > 0 ? "Flagged accounts" : "None flagged",
            deltaClass:
              suspendedUsers > 0 ? "dash-delta-up" : "dash-delta-down",
          },
          {
            label: "LE Dispatches",
            value: leDispatchCount,
            accent: "ab-blue",
            icon: IC.shield,
            delta:
              leDispatchCount > 0
                ? `+${leDispatchCount} this week`
                : "None active",
            deltaClass:
              leDispatchCount > 0 ? "dash-delta-up" : "dash-delta-neutral",
          },
        ].map((c) => (
          <div key={c.label} className={`dash-stat-card ${c.accent}`}>
            <div className="dash-stat-top">
              <div className="dash-stat-label">{c.label}</div>
              <div className="dash-stat-icon">{c.icon}</div>
            </div>
            <div className="dash-stat-value">{c.value}</div>
            <div className={`dash-stat-delta ${c.deltaClass}`}>{c.delta}</div>
          </div>
        ))}
      </div>

      {/* ── Operational Map ──────────────────────────────────────────── */}
      <div className="dash-section-row">
        <div className="dash-section-title">Operational Map</div>
        <div className="dash-section-line" />
        <div className="dash-section-meta">
          {mapMarkers.length} active · {criticalCount} critical
        </div>
      </div>

      <div className="dash-two-col">
        {/* Map */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">Live Incident Map</div>
            <div className="dash-card-meta">{mapMarkers.length} markers</div>
          </div>
          <GoogleMapPanel
            markers={mapMarkers}
            height={300}
            showClusters
            showHeatmap
            emptyMessage="No active incidents with coordinates."
          />
        </div>

        {/* Activity Feed */}
        <div
          className="dash-card"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div className="dash-card-header">
            <div className="dash-card-title">Activity Feed</div>
            <div className="dash-card-meta" style={{ color: "#30A46C" }}>
              Live
            </div>
          </div>
          <div className="dash-feed-list">
            {feedItems.length === 0 ? (
              <div
                style={{ padding: "16px 14px", fontSize: 11, color: "#3D4F65" }}
              >
                No recent activity
              </div>
            ) : (
              feedItems.map((f, i) => (
                <div key={i} className="dash-feed-item">
                  <div className="dash-feed-dot-col">
                    <div
                      className="dash-feed-dot"
                      style={{ background: f.dot, borderColor: f.dot }}
                    />
                    {i < feedItems.length - 1 && (
                      <div className="dash-feed-line" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="dash-feed-action">{f.action}</div>
                    <div className="dash-feed-meta">{f.sub}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Breakdown ────────────────────────────────────────────────── */}
      <div className="dash-section-row">
        <div className="dash-section-title">Breakdown</div>
        <div className="dash-section-line" />
      </div>

      <div className="dash-bottom-row">
        {/* Recent Reports */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">Recent Reports</div>
            <a href="/reports" className="dash-card-action">
              View all {IC.arrow}
            </a>
          </div>
          <table className="dash-mini-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentIncidents.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    style={{
                      color: "#3D4F65",
                      textAlign: "center",
                      padding: "16px 12px",
                    }}
                  >
                    No reports
                  </td>
                </tr>
              ) : (
                recentIncidents.map((r) => {
                  const sc = getStatusCfg(r.status);
                  return (
                    <tr key={r.incident_id}>
                      <td
                        style={{
                          maxWidth: 130,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.title || `#${r.incident_id}`}
                      </td>
                      <td className="dash-td-dim">
                        {r.location_name || r.area_name || "—"}
                      </td>
                      <td>
                        <span
                          className="dash-chip"
                          style={{
                            color: sc.color,
                            borderColor: sc.border,
                            background: `${sc.color}18`,
                          }}
                        >
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Category Breakdown */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">By Category</div>
            <div className="dash-card-meta">{totalIncidents} total</div>
          </div>
          <div className="dash-bar-chart">
            {categoryBars.length === 0 ? (
              <div style={{ fontSize: 11, color: "#3D4F65", padding: "8px 0" }}>
                No category data
              </div>
            ) : (
              categoryBars.map((b, i) => (
                <div key={i} className="dash-bar-row">
                  <div className="dash-bar-label">{b.label}</div>
                  <div className="dash-bar-track">
                    <div
                      className="dash-bar-fill"
                      style={{ width: `${b.pct}%`, background: b.color }}
                    />
                  </div>
                  <div className="dash-bar-count">{b.count}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Reporters */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title">Top Reporters</div>
            <a href="/users" className="dash-card-action">
              All users {IC.arrow}
            </a>
          </div>
          {topReporters.length === 0 ? (
            <div
              style={{ padding: "16px 14px", fontSize: 11, color: "#3D4F65" }}
            >
              No reporter data
            </div>
          ) : (
            topReporters.map((u, i) => {
              const initials = u.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div key={i} className="dash-user-row">
                  <div className="dash-user-avatar">{initials}</div>
                  <div>
                    <div className="dash-user-name">{u.name}</div>
                    <div className="dash-user-meta">Reporter</div>
                  </div>
                  <div className="dash-user-right">
                    <div className="dash-user-count">{u.count}</div>
                    <div className="dash-user-label">reports</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
