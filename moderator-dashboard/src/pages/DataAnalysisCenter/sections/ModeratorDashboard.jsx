import React, { useMemo } from "react";
import {
  CheckCircle2,
  FileText,
  ChevronRight,
  Clock,
  AlertTriangle,
  Zap,
  Activity,
} from "lucide-react";
import { getTimeAgo } from "../../../utils/dateUtils";
import {
  BigStatTile,
  CategoryBarList,
  IncidentRow,
  PlatformStatusCard,
  SectionCard,
  SparklineChart,
  TimeframeLabel,
  EmptyState,
  SkeletonLoader,
} from "../components";
import { severityClass } from "../components/helpers";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function ModeratorLeft({ s, incidents, loading, timeframe = "all" }) {
  // Fake history for demo
  const sparklineData = useMemo(() => {
    if (!s.totalIncidents) return [];
    const val = s.totalIncidents;
    return [
      Math.max(0, val - 45),
      Math.max(0, val - 30),
      Math.max(0, val - 10),
      Math.max(0, val - 5),
      val,
    ];
  }, [s.totalIncidents]);

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 size={12} className="text-primary" />
              <span className="text-[11px] text-muted font-semibold uppercase tracking-widest">
                Total Reports
              </span>
            </div>
            {loading ? (
              <SkeletonLoader className="h-9 w-24 my-1" />
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-bold font-display text-text leading-none"
              >
                {s.totalIncidents.toLocaleString()}
              </motion.p>
            )}
            <p className="text-[11px] text-muted mt-1.5">
              <TimeframeLabel timeframe={timeframe} /> · updated live
            </p>
          </div>
        </div>
        <div className="mt-3 -mx-1">
          <SparklineChart data={sparklineData} />
        </div>
      </div>

      <SectionCard title="Incident Categories">
        <CategoryBarList
          incidents={incidents}
          maxCategories={6}
          accentColor="bg-primary"
          loading={loading}
          emptyTitle="No categories tracked"
          emptyDescription="There are no incidents logged to categorize."
        />
      </SectionCard>

      <PlatformStatusCard stats={s} loading={loading} />
    </>
  );
}

export function ModeratorCenter({ s, incidents, loading }) {
  const navigate = useNavigate();

  const statusCounts = useMemo(() => {
    return incidents.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {});
  }, [incidents]);

  const urgent = useMemo(() => {
    const recentIds = new Set(
      (s.recentIncidents || []).map((r) => r.incident_id),
    );
    const list = [
      ...(s.recentIncidents || []).filter(
        (i) => i.severity === "critical" || i.severity === "high",
      ),
      ...incidents
        .filter(
          (i) =>
            (i.severity === "critical" || i.severity === "high") &&
            !recentIds.has(i.incident_id),
        )
        .slice(0, 6),
    ];
    return list.slice(0, 6);
  }, [s.recentIncidents, incidents]);

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

      <SectionCard title="High-Priority Incidents">
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((i) => (
              <SkeletonLoader key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : urgent.length === 0 ? (
          <EmptyState
            title="No urgent incidents"
            description="Platform is running smoothly. No high severity alerts."
          />
        ) : (
          urgent.map((inc, i) => (
            <IncidentRow
              key={inc.incident_id}
              inc={inc}
              idx={i}
              total={urgent.length}
              badge={inc.severity?.toUpperCase()}
              badgeClass={severityClass(inc.severity)}
              onClick={() => navigate(`/reports?id=${inc.incident_id}`)}
            />
          ))
        )}
      </SectionCard>

      <SectionCard title="Processing Summary">
        <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-2">
          Auto-classified
        </p>
        <div className="mb-4">
          {[
            {
              status: "auto_processed",
              icon: Zap,
              color: "bg-primary/10 text-primary",
            },
            {
              status: "auto_flagged",
              icon: AlertTriangle,
              color: "bg-warning/10 text-warning",
            },
          ].map(({ status, icon: Icon, color }, i) => (
            <div
              key={status}
              className={`flex items-center gap-2.5 py-2 ${i === 0 ? "border-b border-border" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}
              >
                <Icon size={11} />
              </div>
              <span className="flex-1 text-xs text-text capitalize">
                {status.replace(/_/g, " ")}
              </span>
              {loading ? (
                <SkeletonLoader className="h-4 w-6" />
              ) : (
                <span className="text-xs font-semibold text-muted">
                  {statusCounts[status] || 0}
                </span>
              )}
              <ChevronRight size={12} className="text-muted flex-shrink-0" />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted uppercase tracking-widest font-semibold mb-2">
          Needs attention
        </p>
        <div>
          {[
            { status: "in_review", color: "bg-warning/10 text-warning" },
            { status: "needs_info", color: "bg-accent/10 text-accent" },
            { status: "submitted", color: "bg-info/10 text-info" },
          ].map(({ status, color }, i, arr) => (
            <div
              key={status}
              className={`flex items-center gap-2.5 py-2 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}
              >
                <Activity size={11} />
              </div>
              <span className="flex-1 text-xs text-text capitalize">
                {status.replace(/_/g, " ")}
              </span>
              {loading ? (
                <SkeletonLoader className="h-4 w-6" />
              ) : (
                <span className="text-xs font-semibold text-muted">
                  {statusCounts[status] || 0}
                </span>
              )}
              <ChevronRight size={12} className="text-muted flex-shrink-0" />
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

export function ModeratorRight({ s, loading }) {
  const navigate = useNavigate();

  const recentList = useMemo(
    () => (s.recentIncidents || []).slice(0, 7),
    [s.recentIncidents],
  );
  const urgent = useMemo(
    () =>
      (s.recentIncidents || [])
        .filter((i) => i.severity === "critical" || i.severity === "high")
        .slice(0, 4),
    [s.recentIncidents],
  );

  return (
    <>
      <SectionCard title="User Metrics">
        <div className="grid grid-cols-3 gap-2">
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
          ].map(({ label, value, bg, text }) => (
            <div
              key={label}
              className={`rounded-lg px-2 py-2.5 text-center ${bg}`}
            >
              {loading ? (
                <SkeletonLoader className="h-6 w-12 mx-auto mb-1" />
              ) : (
                <p
                  className={`text-lg font-bold font-display leading-none ${text}`}
                >
                  {value}
                </p>
              )}
              <p className="text-[10px] text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Recent Incidents">
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <SkeletonLoader key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : recentList.length === 0 ? (
          <EmptyState
            title="No recent incidents"
            description="No incidents have been submitted recently."
          />
        ) : (
          recentList.map((inc, i) => (
            <div
              key={inc.incident_id}
              className={`flex items-center gap-2 py-2 cursor-pointer hover:bg-surface/50 transition-colors px-1 rounded-md ${i < recentList.length - 1 ? "border-b border-border" : ""}`}
              onClick={() => navigate(`/reports?id=${inc.incident_id}`)}
              role="button"
              tabIndex={0}
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
        {loading ? (
          <div className="space-y-4 py-2">
            {[1, 2].map((i) => (
              <div key={i}>
                <SkeletonLoader className="h-4 w-3/4 mb-1" />
                <SkeletonLoader className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : urgent.length === 0 ? (
          <EmptyState
            title="No critical alerts"
            description="Everything looks stable."
          />
        ) : (
          urgent.map((inc, i, arr) => (
            <div
              key={inc.incident_id}
              className={`py-2.5 cursor-pointer hover:bg-surface/50 transition-colors px-1 rounded-md ${i < arr.length - 1 ? "border-b border-border" : ""}`}
              onClick={() => navigate(`/reports?id=${inc.incident_id}`)}
              role="button"
              tabIndex={0}
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
