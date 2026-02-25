import React from "react";
import { Clock, Zap } from "lucide-react";
import { LEI_STATUS_FILTERS } from "../../../constants/incident";
import { getTimeAgo } from "../../../utils/dateUtils";
import {
  STATUS_ACTION_CONFIG,
  UNACTIONED_AGE_THRESHOLD_MINUTES,
} from "../constants";
import { canTransitionTo, getNextWorkflowStatus, isUnactionedAged } from "../helpers";
import SeverityDots from "./SeverityDots";

function IncidentQueuePanel({
  isLoading,
  incidents,
  selectedIncidentId,
  onSelectIncident,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortMode,
  onSortModeChange,
  statusMutationPending,
  onRequestAction,
}) {
  return (
    <div className="lei-queue-panel">
      <div className="lei-queue-filters">
        <div className="lei-search-box">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--le-text-dim)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by title or description..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="lei-filter-row">
          <select
            className="lei-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            {LEI_STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className={`lei-sort-btn${sortMode === "urgency" ? " active" : ""}`}
            onClick={() => onSortModeChange("urgency")}
          >
            <Zap size={11} /> Urgency
          </button>
          <button
            className={`lei-sort-btn${sortMode === "time" ? " active" : ""}`}
            onClick={() => onSortModeChange("time")}
          >
            <Clock size={11} /> Newest
          </button>
        </div>
      </div>

      <div className="lei-queue-cols">
        <div className="lei-col-label">Incident</div>
        <div className="lei-col-label">Sev.</div>
        <div className="lei-col-label">Age</div>
        <div className="lei-col-label">Action</div>
      </div>

      <div className="lei-incident-list">
        {isLoading ? (
          <div className="lei-empty">Loading…</div>
        ) : incidents.length === 0 ? (
          <div className="lei-empty">No incidents found</div>
        ) : (
          incidents.map((incident) => {
            const aged = isUnactionedAged(incident);
            const isSelected = selectedIncidentId === incident.id;
            const nextStatus = getNextWorkflowStatus(incident.status);
            const nextAction = nextStatus
              ? STATUS_ACTION_CONFIG[nextStatus]
              : null;

            return (
              <div
                key={incident.id}
                className={`lei-incident-row${isSelected ? " selected" : ""}${aged ? " aged" : ""}`}
                onClick={() => onSelectIncident(incident.id)}
              >
                <div>
                  <div className="lei-incident-title">{incident.title}</div>
                  <div className="lei-incident-preview">
                    {incident.description}
                  </div>
                </div>

                <SeverityDots severity={incident.severity} />

                <div className="lei-age-cell">
                  <div>{getTimeAgo(incident.reportedAt)}</div>
                  {aged && (
                    <div className="lei-age-flag">
                      &gt;{UNACTIONED_AGE_THRESHOLD_MINUTES}m
                    </div>
                  )}
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  {nextAction ? (
                    <button
                      className="lei-action-btn"
                      disabled={
                        statusMutationPending ||
                        !canTransitionTo(incident, nextStatus)
                      }
                      onClick={() => onRequestAction(incident, nextStatus)}
                    >
                      {nextAction.label.split(" ")[0]}
                    </button>
                  ) : incident.status === "police_closed" ? (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--le-muted)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      CLOSED
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--le-muted)" }}>
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default IncidentQueuePanel;
