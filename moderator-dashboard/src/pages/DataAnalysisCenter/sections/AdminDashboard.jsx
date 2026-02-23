import React from "react";
import {
  TrendingUp,
  FileText,
  Clock,
  CheckCircle2,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import { getTimeAgo } from "../../../utils/dateUtils";
import SparklineChart from "../components/SparklineChart";
import SectionCard from "../components/SectionCard";
import BigStatTile from "../components/BigStatTile";
import IncidentRow from "../components/IncidentRow";
import { severityClass } from "../components/helpers";
import TimeframeLabel from "../components/TimeframeLabel";
import CategoryBarList from "../components/CategoryBarList";
import PlatformStatusCard from "../components/PlatformStatusCard";

export function AdminLeft({
  s,
  incidents,
  applications,
  loading,
  timeframe = "all",
}) {
  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} className="text-accent" />
              <span className="text-[11px] text-muted font-semibold uppercase tracking-widest">
                Total Reports
              </span>
            </div>
            <p className="text-3xl font-bold font-display text-text leading-none">
              {loading ? "—" : s.totalIncidents.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted mt-1.5">
              Platform-wide · <TimeframeLabel timeframe={timeframe} />
            </p>
          </div>
        </div>
        <div className="mt-3 -mx-1">
          <SparklineChart
            value={s.totalIncidents}
            color="var(--color-accent)"
          />
        </div>
      </div>

      <SectionCard title="Incident Categories">
        <CategoryBarList
          incidents={incidents}
          maxCategories={5}
          accentColor="bg-accent"
          loading={loading}
          emptyDescription=""
          emptyText="No data"
        />
      </SectionCard>

      <PlatformStatusCard
        stats={s}
        loading={loading}
        extras={[
          {
            label: "Applications",
            value: applications.length,
            color: "text-accent",
          },
        ]}
      />
    </>
  );
}

export function AdminCenter({ s, incidents, applications, loading }) {
  const urgent = [
    ...(s.recentIncidents || []).filter(
      (i) => i.severity === "critical" || i.severity === "high",
    ),
    ...incidents
      .filter(
        (i) =>
          (i.severity === "critical" || i.severity === "high") &&
          !(s.recentIncidents || []).find(
            (r) => r.incident_id === i.incident_id,
          ),
      )
      .slice(0, 4),
  ].slice(0, 4);

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <BigStatTile
          label="Pending"
          value={s.pendingReports}
          icon={Clock}
          iconColor="text-warning"
          loading={loading}
        />
        <BigStatTile
          label="Verified"
          value={s.verifiedReports}
          icon={CheckCircle2}
          iconColor="text-success"
          loading={loading}
        />
      </div>

      <SectionCard title="Staff Applications">
        {loading ? (
          <p className="text-xs text-muted text-center py-3">Loading…</p>
        ) : applications.length === 0 ? (
          <div className="flex items-center gap-2 py-3">
            <UserCheck size={14} className="text-success" />
            <p className="text-xs text-success font-medium">
              No pending applications
            </p>
          </div>
        ) : (
          applications.slice(0, 5).map((app, i, arr) => (
            <div
              key={app.user_id}
              className={`flex items-center gap-2.5 py-2.5 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <UserCheck size={11} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text truncate">
                  {app.username || app.email}
                </p>
                <p className="text-[10px] text-muted capitalize">
                  {app.role?.replace(/_/g, " ")} · {getTimeAgo(app.created_at)}
                </p>
              </div>
              <span className="text-[10px] font-bold text-accent flex-shrink-0">
                PENDING
              </span>
              <ChevronRight size={12} className="text-muted flex-shrink-0" />
            </div>
          ))
        )}
        {applications.length > 5 && (
          <p className="text-[10px] text-muted text-center pt-2">
            +{applications.length - 5} more
          </p>
        )}
      </SectionCard>

      <SectionCard title="High-Priority Incidents">
        {urgent.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">
            No critical or high-severity reports
          </p>
        ) : (
          urgent.map((inc, i) => (
            <IncidentRow
              key={inc.incident_id}
              inc={inc}
              idx={i}
              total={urgent.length}
              badge={inc.severity?.toUpperCase()}
              badgeClass={severityClass(inc.severity)}
            />
          ))
        )}
      </SectionCard>
    </>
  );
}

export function AdminRight({ s, applications, loading }) {
  const recentList = (s.recentIncidents || []).slice(0, 5);
  const urgent = (s.recentIncidents || [])
    .filter((i) => i.severity === "critical" || i.severity === "high")
    .slice(0, 3);

  return (
    <>
      <SectionCard title="User Metrics">
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: "Total",
              value: s.totalUsers,
              bg: "bg-primary/10",
              text: "text-primary",
            },
            {
              label: "Active",
              value: s.activeUsers,
              bg: "bg-success/10",
              text: "text-success",
            },
            {
              label: "Suspended",
              value: s.suspendedUsers,
              bg: "bg-error/10",
              text: "text-error",
            },
            {
              label: "Applications",
              value: applications.length,
              bg: "bg-accent/10",
              text: "text-accent",
            },
          ].map(({ label, value, bg, text }) => (
            <div
              key={label}
              className={`rounded-lg px-2 py-2.5 text-center ${bg}`}
            >
              <p
                className={`text-lg font-bold font-display leading-none ${text}`}
              >
                {loading ? "—" : value}
              </p>
              <p className="text-[10px] text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Recent Incidents">
        {recentList.length === 0 ? (
          <p className="text-xs text-muted text-center py-3">
            No recent incidents
          </p>
        ) : (
          recentList.map((inc, i) => (
            <div
              key={inc.incident_id}
              className={`flex items-center gap-2 py-2 ${i < recentList.length - 1 ? "border-b border-border" : ""}`}
            >
              <FileText size={11} className="text-muted flex-shrink-0" />
              <span className="flex-1 text-xs text-text truncate min-w-0">
                {inc.title || `Incident #${inc.incident_id}`}
              </span>
              <ChevronRight size={12} className="text-muted flex-shrink-0" />
            </div>
          ))
        )}
      </SectionCard>

      <SectionCard title="Critical Alerts">
        {urgent.length === 0 ? (
          <p className="text-xs text-muted text-center py-3">
            No critical alerts
          </p>
        ) : (
          urgent.map((inc, i, arr) => (
            <div
              key={inc.incident_id}
              className={`py-2.5 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <p className="text-xs font-semibold text-text truncate">
                {inc.title || `Incident #${inc.incident_id}`}
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <span
                  className={`text-[10px] font-bold ${severityClass(inc.severity)}`}
                >
                  {inc.severity?.toUpperCase()}
                </span>
                <span className="text-[10px] text-muted">
                  {getTimeAgo(inc.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </SectionCard>
    </>
  );
}
