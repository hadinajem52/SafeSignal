import React from "react";
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { getTimeAgo } from "../../../utils/dateUtils";
import {
  BigStatTile,
  IncidentRow,
  SectionCard,
  SparklineChart,
  TimeframeLabel,
} from "../components";
import { severityClass, leiStatusColor } from "../components/helpers";
import { UNACTIONED_THRESHOLD_MS } from "../components/constants";

const STATUS_BG = {
  verified: "bg-warning",
  dispatched: "bg-primary",
  on_scene: "bg-info",
  investigating: "bg-purple-400",
};

const LEI_STAGES = ["verified", "dispatched", "on_scene", "investigating"];

export function LeiLeft({ leiIncidents, loading, timeframe = "all" }) {
  const stageCounts = LEI_STAGES.map((st) => ({
    status: st,
    count: leiIncidents.filter((i) => i.status === st).length,
  }));
  const activeCount = stageCounts.reduce((sum, s) => sum + s.count, 0);
  const maxStage = Math.max(...stageCounts.map((s) => s.count), 1);
  const recentlyClosed = leiIncidents
    .filter((i) => i.status === "police_closed")
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at) -
        new Date(a.updated_at || a.created_at),
    )
    .slice(0, 4);

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Radio size={12} className="text-warning" />
              <span className="text-[11px] text-muted font-semibold uppercase tracking-widest">
                Active Deployments
              </span>
            </div>
            <p className="text-3xl font-bold font-display text-text leading-none">
              {loading ? "—" : activeCount}
            </p>
            <p className="text-[11px] text-muted mt-1.5">
              Verified + dispatched + on-scene + investigating ·{" "}
              <TimeframeLabel timeframe={timeframe} />
            </p>
          </div>
        </div>
        <div className="mt-3 -mx-1">
          <SparklineChart value={activeCount} color="var(--color-warning)" />
        </div>
      </div>

      <SectionCard title="Cases by Stage">
        {stageCounts.map(({ status, count }, i) => (
          <div
            key={status}
            className={`flex items-center gap-3 py-2.5 ${i < stageCounts.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="w-6 h-6 rounded bg-surface flex items-center justify-center flex-shrink-0">
              <Radio size={10} className="text-muted" />
            </div>
            <span className="flex-1 text-xs text-text capitalize min-w-0">
              {status.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-muted w-5 text-right flex-shrink-0">
              {count}
            </span>
            <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden flex-shrink-0">
              <div
                className={`h-full rounded-full ${STATUS_BG[status] || "bg-muted"}`}
                style={{ width: `${Math.round((count / maxStage) * 100)}%` }}
              />
            </div>
            <ChevronRight size={12} className="text-muted flex-shrink-0" />
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Recently Closed">
        {recentlyClosed.length === 0 ? (
          <p className="text-xs text-muted text-center py-3">No closed cases</p>
        ) : (
          recentlyClosed.map((inc, i) => (
            <div
              key={inc.incident_id}
              className={`flex items-center gap-2 py-2.5 ${i < recentlyClosed.length - 1 ? "border-b border-border" : ""}`}
            >
              <CheckCircle2 size={11} className="text-success flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text truncate">
                  {inc.title || `Case #${inc.incident_id}`}
                </p>
                <p className="text-[10px] text-muted">
                  {getTimeAgo(inc.updated_at || inc.created_at)}
                </p>
              </div>
              <ChevronRight size={12} className="text-muted flex-shrink-0" />
            </div>
          ))
        )}
      </SectionCard>
    </>
  );
}

export function LeiCenter({ leiIncidents, loading }) {
  const activeCases = leiIncidents.filter((i) =>
    ["verified", "dispatched", "on_scene", "investigating"].includes(i.status),
  );
  const dispatched = leiIncidents.filter((i) => i.status === "dispatched");
  const now = Date.now();
  const unactioned = leiIncidents
    .filter(
      (i) =>
        i.status === "verified" &&
        now - new Date(i.created_at).getTime() > UNACTIONED_THRESHOLD_MS,
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(0, 5);
  const incoming = leiIncidents
    .filter(
      (i) =>
        i.status === "verified" &&
        now - new Date(i.created_at).getTime() <= UNACTIONED_THRESHOLD_MS,
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <BigStatTile
          label="Active Cases"
          value={activeCases.length}
          icon={Radio}
          iconColor="text-warning"
          loading={loading}
        />
        <BigStatTile
          label="Dispatched"
          value={dispatched.length}
          icon={MapPin}
          iconColor="text-primary"
          loading={loading}
        />
      </div>

      <SectionCard title="Unactioned Alerts">
        {loading ? (
          <p className="text-xs text-muted text-center py-3">Loading…</p>
        ) : unactioned.length === 0 ? (
          <div className="flex items-center gap-2 py-3">
            <CheckCircle2 size={14} className="text-success" />
            <p className="text-xs text-success font-medium">
              All verified cases actioned within 30 min
            </p>
          </div>
        ) : (
          unactioned.map((inc, i) => (
            <div
              key={inc.incident_id}
              className={`flex items-center gap-2.5 py-2.5 ${i < unactioned.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="w-7 h-7 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={11} className="text-error" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text truncate">
                  {inc.title || `Case #${inc.incident_id}`}
                </p>
                <p className="text-[10px] text-error font-semibold">
                  Idle {getTimeAgo(inc.created_at)} · needs dispatch
                </p>
              </div>
              <ChevronRight size={12} className="text-muted flex-shrink-0" />
            </div>
          ))
        )}
      </SectionCard>

      <SectionCard title="Incoming Cases">
        {loading ? (
          <p className="text-xs text-muted text-center py-3">Loading…</p>
        ) : incoming.length === 0 ? (
          <p className="text-xs text-muted text-center py-3">
            No new incoming cases
          </p>
        ) : (
          incoming.map((inc, i) => (
            <IncidentRow
              key={inc.incident_id}
              inc={inc}
              idx={i}
              total={incoming.length}
              badge={inc.severity?.toUpperCase()}
              badgeClass={severityClass(inc.severity)}
            />
          ))
        )}
      </SectionCard>
    </>
  );
}

export function LeiRight({ leiIncidents, loading }) {
  const active = leiIncidents.filter((i) =>
    ["verified", "dispatched", "on_scene", "investigating"].includes(i.status),
  );
  const sev = ["critical", "high", "medium", "low"].map((s) => ({
    label: s,
    count: active.filter((i) => i.severity === s).length,
    color: severityClass(s),
  }));
  const nearClosure = leiIncidents
    .filter((i) => i.status === "investigating")
    .slice(0, 5);
  const allStages = [
    "verified",
    "dispatched",
    "on_scene",
    "investigating",
    "police_closed",
  ].map((st) => ({
    status: st,
    count: leiIncidents.filter((i) => i.status === st).length,
  }));

  return (
    <>
      <SectionCard title="Severity Breakdown">
        <div className="grid grid-cols-2 gap-2">
          {sev.map(({ label, count, color }) => (
            <div
              key={label}
              className="bg-surface rounded-lg px-2 py-2.5 text-center"
            >
              <p
                className={`text-lg font-bold font-display leading-none ${color}`}
              >
                {loading ? "—" : count}
              </p>
              <p className="text-[10px] text-muted mt-1 capitalize">{label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Near Closure">
        {loading ? (
          <p className="text-xs text-muted text-center py-3">Loading…</p>
        ) : nearClosure.length === 0 ? (
          <p className="text-xs text-muted text-center py-3">
            No cases in investigating stage
          </p>
        ) : (
          nearClosure.map((inc, i) => (
            <div
              key={inc.incident_id}
              className={`flex items-center gap-2 py-2.5 ${i < nearClosure.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text truncate">
                  {inc.title || `Case #${inc.incident_id}`}
                </p>
                <p className="text-[10px] text-muted">
                  {getTimeAgo(inc.created_at)}
                </p>
              </div>
              <ChevronRight size={12} className="text-muted flex-shrink-0" />
            </div>
          ))
        )}
      </SectionCard>

      <SectionCard title="All Stages">
        {allStages.map((item, i) => (
          <div
            key={item.status}
            className={`flex items-center gap-2 py-2 ${i < allStages.length - 1 ? "border-b border-border" : ""}`}
          >
            <span className="flex-1 text-xs text-text capitalize">
              {item.status.replace(/_/g, " ")}
            </span>
            <span
              className={`text-xs font-bold ${leiStatusColor(item.status)}`}
            >
              {loading ? "—" : item.count}
            </span>
            <ChevronRight size={12} className="text-muted flex-shrink-0" />
          </div>
        ))}
      </SectionCard>
    </>
  );
}
