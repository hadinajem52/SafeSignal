import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Shield, Wifi } from "lucide-react";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";
import leStyles from "./styles";
import {
  LEI_MIN_DETAIL_WIDTH,
  LEI_QUEUE_WIDTH,
  LEI_SPLITTER_WIDTH,
  VIEWS,
} from "./constants";
import {
  AlertBanner,
  ClosedCasesView,
  IncidentDetailPane,
  IncidentQueuePanel,
  OpsMapView,
} from "./components";
import useLeiData from "./hooks/useLeiData";
import useLeiRealtime from "./hooks/useLeiRealtime";
import useLeiStatusTransitions from "./hooks/useLeiStatusTransitions";
import useQueueSplitter from "./hooks/useQueueSplitter";
import useToastStack from "./hooks/useToastStack";

function LawEnforcement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useState("queue");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("verified");
  const [sortMode, setSortMode] = useState("urgency");
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [leiAlerts, setLeiAlerts] = useState([]);
  const [lastRealtimeAlertAt, setLastRealtimeAlertAt] = useState(null);

  const { toasts, pushToast } = useToastStack();

  const {
    queuePanelWidth,
    isQueueSplitterActive,
    queueLayoutRef,
    handleQueueSplitterPointerDown,
    handleQueueSplitterKeyDown,
  } = useQueueSplitter({
    activeView,
    minWidth: LEI_QUEUE_WIDTH.min,
    maxWidth: LEI_QUEUE_WIDTH.max,
    defaultWidth: LEI_QUEUE_WIDTH.default,
    splitterWidth: LEI_SPLITTER_WIDTH,
    minDetailWidth: LEI_MIN_DETAIL_WIDTH,
  });

  const {
    isLoading,
    filteredIncidents,
    allLeiIncidents,
    selectedIncident,
    actionLog,
    displayAlerts,
  } = useLeiData({
    statusFilter,
    searchTerm,
    sortMode,
    selectedIncidentId,
    leiAlerts,
  });

  useEffect(() => {
    if (!selectedIncidentId && filteredIncidents.length) {
      setSelectedIncidentId(filteredIncidents[0].id);
    }
  }, [filteredIncidents, selectedIncidentId]);

  useEffect(() => {
    const statusById = new Map(
      allLeiIncidents.map((inc) => [String(inc.incident_id), inc.status]),
    );
    setLeiAlerts((prev) =>
      prev.filter((a) => {
        const s = statusById.get(String(a.incidentId));
        return !s || s === "verified";
      }),
    );
  }, [allLeiIncidents]);

  const {
    statusMutation,
    requestStatusUpdate,
    pendingTransition,
    setPendingTransition,
    confirmPendingTransition,
    handleAlertDispatch,
    pendingActionConfig,
  } = useLeiStatusTransitions({
    queryClient,
    pushToast,
    setLeiAlerts,
    filteredIncidents,
  });

  useLeiRealtime({
    user,
    queryClient,
    pushToast,
    setLeiAlerts,
    setLastRealtimeAlertAt,
  });

  const hasFreshRealtimeAlert =
    typeof lastRealtimeAlertAt === "number" &&
    Date.now() - lastRealtimeAlertAt < 12000;

  if (user?.role !== "law_enforcement" && user?.role !== "admin") {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <AlertTriangle
          size={48}
          style={{ margin: "0 auto 16px", color: "#F5A623" }}
        />
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "#D9E4F0",
          }}
        >
          Access Restricted
        </h2>
        <p style={{ color: "#5C7390", marginTop: 8 }}>
          You do not have permission to view the Law Enforcement Interface.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{leStyles}</style>
      <div
        className="lei-root"
        style={{
          display: "flex",
          flexDirection: "column",
          margin: "-32px",
          height: "100dvh",
          overflow: "hidden",
        }}
      >
        <div className="lei-topbar">
          <div className="lei-topbar-title">
            <Shield
              size={16}
              style={{ color: "var(--le-blue)", flexShrink: 0 }}
            />
            Law Enforcement Operations
          </div>
          <div className="lei-tab-bar">
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`lei-tab${activeView === id ? " active" : ""}`}
                onClick={() => setActiveView(id)}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div className="lei-live-indicator">
              <div
                className="lei-live-dot"
                style={{
                  background: hasFreshRealtimeAlert
                    ? "var(--le-amber)"
                    : "var(--le-green)",
                }}
              />
              <span
                style={{
                  color: hasFreshRealtimeAlert
                    ? "var(--le-amber)"
                    : "var(--le-green)",
                }}
              >
                Live
              </span>
              <Wifi
                size={12}
                style={{
                  color: hasFreshRealtimeAlert
                    ? "var(--le-amber)"
                    : "var(--le-green)",
                }}
              />
            </div>
          </div>
        </div>

        {activeView === "queue" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <AlertBanner
              alerts={displayAlerts}
              onDispatch={handleAlertDispatch}
              statusMutationPending={statusMutation.isPending}
              onSelectIncident={setSelectedIncidentId}
            />
            <div className="lei-content">
              <div ref={queueLayoutRef} className="lei-content-inner">
                <div
                  style={{
                    width: `${queuePanelWidth}px`,
                    flexShrink: 0,
                    minWidth: 0,
                    minHeight: 0,
                    overflow: "hidden",
                  }}
                >
                  <IncidentQueuePanel
                    isLoading={isLoading}
                    incidents={filteredIncidents}
                    selectedIncidentId={selectedIncidentId}
                    onSelectIncident={setSelectedIncidentId}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    sortMode={sortMode}
                    onSortModeChange={setSortMode}
                    statusMutationPending={statusMutation.isPending}
                    onRequestAction={requestStatusUpdate}
                  />
                </div>
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize queue and detail panels"
                  tabIndex={0}
                  aria-valuemin={LEI_QUEUE_WIDTH.min}
                  aria-valuemax={LEI_QUEUE_WIDTH.max}
                  aria-valuenow={Math.round(queuePanelWidth)}
                  className={`lei-splitter${isQueueSplitterActive ? " active" : ""}`}
                  onPointerDown={handleQueueSplitterPointerDown}
                  onKeyDown={handleQueueSplitterKeyDown}
                />
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    overflow: "hidden",
                  }}
                >
                  <IncidentDetailPane
                    incident={selectedIncident}
                    actionLog={actionLog}
                    statusMutationPending={statusMutation.isPending}
                    onRequestAction={requestStatusUpdate}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "map" && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <OpsMapView incidents={allLeiIncidents} />
          </div>
        )}

        {activeView === "closed" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
              background: "var(--le-bg)",
            }}
          >
            <ClosedCasesView />
          </div>
        )}

        <div className="lei-toast-stack">
          {toasts.map((toast) => (
            <div key={toast.id} className={`lei-toast ${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        visible={Boolean(pendingTransition)}
        title={pendingActionConfig?.confirmTitle || "Confirm status update?"}
        message={
          pendingActionConfig?.confirmMessage ||
          "This will update the incident workflow state."
        }
        confirmLabel={pendingActionConfig?.label || "Confirm"}
        confirmClassName={
          pendingActionConfig?.confirmClassName ||
          "bg-primary hover:bg-primary/90"
        }
        confirmDisabled={statusMutation.isPending}
        onCancel={() => setPendingTransition(null)}
        onConfirm={confirmPendingTransition}
      />
    </>
  );
}

export default LawEnforcement;
