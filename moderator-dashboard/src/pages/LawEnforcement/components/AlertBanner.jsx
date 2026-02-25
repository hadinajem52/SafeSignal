import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { SEVERITY_COLOR } from "../constants";
import { openMapsUrl } from "../../../utils/incidentUtils";

function AlertBanner({
  alerts,
  onDispatch,
  statusMutationPending,
  onSelectIncident,
}) {
  const [expanded, setExpanded] = useState(true);
  if (!alerts.length) return null;

  return (
    <div
      style={{ borderBottom: "1px solid rgba(245,166,35,0.2)", flexShrink: 0 }}
    >
      <button
        className="lei-alert-banner-toggle"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="lei-alert-banner-left">
          <AlertTriangle size={14} />
          <span className="lei-alert-count">{alerts.length}</span>
          <span style={{ fontWeight: 600, letterSpacing: "0.04em" }}>
            Unactioned alerts require immediate review
          </span>
        </div>
        {expanded ? (
          <ChevronUp
            size={13}
            style={{ color: "var(--le-amber)", flexShrink: 0 }}
          />
        ) : (
          <ChevronDown
            size={13}
            style={{ color: "var(--le-amber)", flexShrink: 0 }}
          />
        )}
      </button>

      {expanded && (
        <div className="lei-alert-rows">
          {alerts.map((alert) => (
            <div
              key={alert.incidentId}
              className="lei-alert-row"
              onClick={() => onSelectIncident(alert.incidentId)}
            >
              <div className="lei-alert-row-left">
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: SEVERITY_COLOR[alert.severity] || "var(--le-amber)",
                    flexShrink: 0,
                  }}
                >
                  {alert.severity?.toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--le-text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {alert.title || `Incident #${alert.incidentId}`}
                </span>
              </div>
              <div
                className="lei-alert-row-actions"
                onClick={(e) => e.stopPropagation()}
              >
                {Number.isFinite(Number(alert.latitude)) && (
                  <a
                    href={openMapsUrl(alert.latitude, alert.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--le-blue)",
                      textDecoration: "none",
                    }}
                  >
                    Map ↗
                  </a>
                )}
                <button
                  className="lei-action-btn"
                  disabled={
                    statusMutationPending || alert.status !== "verified"
                  }
                  onClick={() => onDispatch(alert)}
                >
                  Dispatch
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AlertBanner;
