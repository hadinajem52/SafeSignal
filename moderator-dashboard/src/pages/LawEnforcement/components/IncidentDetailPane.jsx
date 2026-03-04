import React from "react";
import { ArrowUpRight } from "lucide-react";
import { CLOSURE_OUTCOMES } from "../../../constants/incident";
import GoogleMapPanel from "../../../components/GoogleMapPanel";
import { getTimeAgo } from "../../../utils/dateUtils";
import { openMapsUrl } from "../../../utils/incidentUtils";
import { STATUS_ACTION_CONFIG, WORKFLOW_STEPS } from "../constants";
import { getNextWorkflowStatus } from "../helpers";

function IncidentDetailPane({
  incident,
  actionLog,
  statusMutationPending,
  onRequestAction,
  isDisclosed,
  onDisclosedChange,
  isLocationFuzzed,
  onLocationFuzzedChange,
  closureOutcome,
  onClosureOutcomeChange,
  caseId,
  onCaseIdChange,
  officerNotes,
  onOfficerNotesChange,
}) {
  if (!incident) {
    return (
      <div className="lei-detail-panel">
        <div className="lei-select-prompt">
          Select an incident from the queue
        </div>
      </div>
    );
  }

  const currentStepIndex = WORKFLOW_STEPS.findIndex(
    (s) => s.id === incident.status,
  );
  const nextStatus = getNextWorkflowStatus(incident.status);
  const nextAction = nextStatus ? STATUS_ACTION_CONFIG[nextStatus] : null;
  const isComplete = incident.status === "police_closed";
  const statusKey = incident.status || "pending";

  return (
    <div className="lei-detail-panel">
      <div className="lei-detail-scroll">
        <div className="lei-detail-header">
          <div className="lei-detail-title">{incident.title}</div>
          <div className={`lei-status-chip ${statusKey}`}>
            {statusKey.replace(/_/g, " ")}
          </div>
        </div>

        <p className="lei-detail-body">{incident.description}</p>

        <div className="lei-meta-grid">
          <div className="lei-meta-cell">
            <div className="lei-meta-label">Reporter</div>
            <div className="lei-meta-value">
              {incident.username || "Unknown"}
            </div>
          </div>
          <div className="lei-meta-cell">
            <div className="lei-meta-label">Reported</div>
            <div
              className="lei-meta-value"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {getTimeAgo(incident.reportedAt)}
            </div>
          </div>
          <div className="lei-meta-cell">
            <div className="lei-meta-label">Location</div>
            <div
              className="lei-meta-value"
              style={{ fontSize: 11, color: "var(--le-blue)" }}
            >
              {incident.location_name ||
                (Number.isFinite(Number(incident.latitude))
                  ? `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}`
                  : "Unknown")}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div className="lei-section-label">Status Workflow</div>
          <div className="lei-workflow-steps">
            {WORKFLOW_STEPS.map((step, i) => {
              const isDone = currentStepIndex >= i;
              const isCurrent = currentStepIndex === i;
              return (
                <div
                  key={step.id}
                  className={`lei-workflow-step${isDone ? " done" : ""}`}
                >
                  <div
                    className={`lei-step-circle${isDone ? " done" : isCurrent ? " current" : ""}`}
                  >
                    {isDone ? "✓" : i + 1}
                  </div>
                  <div
                    className={`lei-step-name${isDone ? " done" : isCurrent ? " current" : ""}`}
                  >
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lei-action-row">
            {isComplete ? (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--le-muted)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  paddingTop: 10,
                }}
              >
                Case closed.
              </span>
            ) : (
              <>
                {nextAction && (
                  <button
                    className="lei-btn-primary"
                    disabled={statusMutationPending}
                    onClick={() => onRequestAction(incident, nextStatus)}
                  >
                    <ArrowUpRight size={13} />
                    {nextAction.label}
                  </button>
                )}
                <div
                  style={{
                    width: "100%",
                    background: "rgba(59,158,255,0.06)",
                    border: "1px solid rgba(59,158,255,0.18)",
                    borderRadius: 6,
                    padding: "10px 12px",
                    marginBottom: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--le-blue)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 2,
                    }}
                  >
                    Close Case Options
                  </div>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontSize: 11,
                      color: "var(--le-text)",
                    }}
                  >
                    <span>Closure Outcome</span>
                    <select
                      value={closureOutcome}
                      onChange={(e) => onClosureOutcomeChange(e.target.value)}
                      style={{
                        background: "var(--le-surface)",
                        border: "1px solid rgba(59,158,255,0.18)",
                        color: "var(--le-text)",
                        padding: "8px 10px",
                        borderRadius: 6,
                      }}
                    >
                      {CLOSURE_OUTCOMES.map((outcome) => (
                        <option key={outcome.value} value={outcome.value}>
                          {outcome.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {closureOutcome === "report_filed" ? (
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        fontSize: 11,
                        color: "var(--le-text)",
                      }}
                    >
                      <span>Case ID</span>
                      <input
                        type="text"
                        value={caseId}
                        onChange={(e) => onCaseIdChange(e.target.value)}
                        placeholder="Enter filed case ID"
                        style={{
                          background: "var(--le-surface)",
                          border: "1px solid rgba(59,158,255,0.18)",
                          color: "var(--le-text)",
                          padding: "8px 10px",
                          borderRadius: 6,
                        }}
                      />
                    </label>
                  ) : null}

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontSize: 11,
                      color: "var(--le-text)",
                    }}
                  >
                    <span>Closure Notes</span>
                    <textarea
                      value={officerNotes}
                      onChange={(e) => onOfficerNotesChange(e.target.value)}
                      placeholder="Optional notes for the closure record"
                      rows={3}
                      style={{
                        background: "var(--le-surface)",
                        border: "1px solid rgba(59,158,255,0.18)",
                        color: "var(--le-text)",
                        padding: "8px 10px",
                        borderRadius: 6,
                        resize: "vertical",
                      }}
                    />
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isDisclosed}
                      onChange={(e) => {
                        onDisclosedChange(e.target.checked);
                        if (!e.target.checked) onLocationFuzzedChange(false);
                      }}
                      style={{ accentColor: "var(--le-blue)", width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: 11, color: "var(--le-text)" }}>
                      Publish to Community Feed
                    </span>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: isDisclosed ? "pointer" : "not-allowed",
                      opacity: isDisclosed ? 1 : 0.4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isLocationFuzzed}
                      disabled={!isDisclosed}
                      onChange={(e) => onLocationFuzzedChange(e.target.checked)}
                      style={{ accentColor: "var(--le-blue)", width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: 11, color: "var(--le-text)" }}>
                      Fuzz Location for Privacy
                    </span>
                  </label>

                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--le-muted)",
                      marginTop: 2,
                      lineHeight: 1.5,
                    }}
                  >
                    Once published, this report will appear in the mobile Community Feed visible to all citizens.
                  </div>
                </div>
                <button
                  className="lei-btn-close"
                  disabled={statusMutationPending}
                  onClick={() => onRequestAction(incident, "police_closed")}
                >
                  Close Case
                </button>
              </>
            )}
          </div>
        </div>

        <div className="lei-section-label">Incident Location</div>
        <div className="lei-map-container">
          <GoogleMapPanel
            markers={[
              {
                id: `lei-${incident.id}`,
                lat: incident.latitude,
                lng: incident.longitude,
                title: incident.title,
              },
            ]}
            center={{ lat: incident.latitude, lng: incident.longitude }}
            zoom={15}
            height={220}
            autoFit={false}
            emptyMessage="No coordinates available."
          />
          {Number.isFinite(Number(incident.latitude)) && (
            <>
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 10,
                  fontSize: 9,
                  color: "var(--le-muted)",
                  fontVariantNumeric: "tabular-nums",
                  background: "rgba(7,9,11,0.7)",
                  padding: "2px 6px",
                  zIndex: 10,
                }}
              >
                {Number(incident.latitude).toFixed(6)},{" "}
                {Number(incident.longitude).toFixed(6)}
              </div>
              <a
                href={openMapsUrl(incident.latitude, incident.longitude)}
                target="_blank"
                rel="noreferrer"
                className="lei-map-open-link"
              >
                ↗ Open in Maps
              </a>
            </>
          )}
        </div>

        {incident.photo_urls?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="lei-section-label">Evidence</div>
            <div className="lei-evidence-grid">
              {incident.photo_urls.map((url, i) => (
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt="Evidence"
                  className="lei-evidence-img"
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <div className="lei-section-label">Chain of Custody</div>
          {actionLog.length ? (
            actionLog.map((entry) => (
              <div key={entry.action_id} className="lei-custody-entry">
                <div className="lei-custody-action">
                  {entry.action_type?.replace(/_/g, " ")}
                </div>
                <div className="lei-custody-meta">
                  {entry.moderator_name || "System"} ·{" "}
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                {entry.notes && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--le-text-dim)",
                      marginTop: 4,
                    }}
                  >
                    {entry.notes}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ fontSize: 11, color: "var(--le-muted)" }}>
              No actions recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncidentDetailPane;
