import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Shield, Wifi } from "lucide-react";
import ConfirmDialog from "../../components/ConfirmDialog";
import TimelineCommsPanel from "../../components/TimelineCommsPanel";
import IncidentTimeline from "../../components/IncidentTimeline";
import { useAuth } from "../../context/AuthContext";
import useAwaitingReply from "../../hooks/useAwaitingReply";
import useIsMobile from "../../hooks/useIsMobile";
import { useSearchParamState } from "../../hooks/useSearchParamState";
import { SUBNAV } from "../../constants/subnav";
import { ROUTES } from "../../constants/routes";
import leStyles from "./styles";
import {
  LEI_COMMS_WIDTH,
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
import useTimelinePanelResize from "./hooks/useTimelinePanelResize";
import useToastStack from "./hooks/useToastStack";

function LawEnforcement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = useSearchParamState(
    SUBNAV[ROUTES.LEI].paramKey,
    SUBNAV[ROUTES.LEI].defaultValue,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("verified");
  const [sortMode, setSortMode] = useState("urgency");
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [leiAlerts, setLeiAlerts] = useState([]);
  const [lastRealtimeAlertAt, setLastRealtimeAlertAt] = useState(null);
  const [mobileView, setMobileView] = useState("list");
  const [mobileTab, setMobileTab] = useState("detail");
  const isMobile = useIsMobile();

  const handleSelectIncident = useCallback((id) => {
    setSelectedIncidentId(id);
    setMobileView("detail");
    setMobileTab("detail");
  }, []);

  const { toasts, pushToast } = useToastStack();
  const { data: awaitingReplyIds } = useAwaitingReply();

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
    panelWidth: commsPanelWidth,
    isActive: isCommsSplitterActive,
    handlePointerDown: handleCommsSplitterPointerDown,
    handleKeyDown: handleCommsSplitterKeyDown,
  } = useTimelinePanelResize({
    containerRef: queueLayoutRef,
    queueWidth: queuePanelWidth,
    minWidth: LEI_COMMS_WIDTH.min,
    maxWidth: LEI_COMMS_WIDTH.max,
    defaultWidth: LEI_COMMS_WIDTH.default,
    splitterWidth: LEI_SPLITTER_WIDTH,
    minDetailWidth: LEI_MIN_DETAIL_WIDTH,
  });

  const {
    isLoading,
    filteredIncidents,
    allLeiIncidents,
    activeLeiIncidents,
    selectedIncident,
    actionLog,
    linkedDuplicates,
    displayAlerts,
  } = useLeiData({
    statusFilter,
    searchTerm,
    sortMode,
    selectedIncidentId,
    leiAlerts,
  });

  useEffect(() => {
    if (!filteredIncidents.length) {
      if (selectedIncidentId) setSelectedIncidentId(null);
      return;
    }

    const hasVisibleSelection = filteredIncidents.some(
      (incident) => String(incident.id) === String(selectedIncidentId),
    );

    if (!hasVisibleSelection) {
      setSelectedIncidentId(filteredIncidents[0].id);
    }
  }, [filteredIncidents, selectedIncidentId]);

  useEffect(() => {
    const statusById = new Map(
      allLeiIncidents.map((inc) => [String(inc.incident_id), inc.status]),
    );
    setLeiAlerts((prev) => {
      const next = prev.filter((a) => {
        const s = statusById.get(String(a.incidentId));
        return !s || s === "verified";
      });
      return next.length === prev.length ? prev : next;
    });
  }, [allLeiIncidents]);

  const {
    statusMutation,
    requestStatusUpdate,
    requestDisclosureUpdate,
    pendingTransition,
    setPendingTransition,
    confirmPendingTransition,
    handleAlertDispatch,
    pendingActionConfig,
    isDisclosed,
    setIsDisclosed,
    isLocationFuzzed,
    setIsLocationFuzzed,
    isMediaDisclosed,
    setIsMediaDisclosed,
    closureOutcome,
    setClosureOutcome,
    caseId,
    setCaseId,
    officerNotes,
    setOfficerNotes,
    syncDisclosureOptions,
  } = useLeiStatusTransitions({
    queryClient,
    pushToast,
    setLeiAlerts,
    filteredIncidents,
  });

  useEffect(() => {
    syncDisclosureOptions(selectedIncident);
  }, [selectedIncident, syncDisclosureOptions]);

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

  const incidentQueueEl = (
    <IncidentQueuePanel
      isLoading={isLoading}
      incidents={filteredIncidents}
      selectedIncidentId={selectedIncidentId}
      onSelectIncident={handleSelectIncident}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      sortMode={sortMode}
      onSortModeChange={setSortMode}
      statusMutationPending={statusMutation.isPending}
      onRequestAction={requestStatusUpdate}
      unreadIncidentIds={awaitingReplyIds}
    />
  );

  const incidentDetailEl = (
    <IncidentDetailPane
      incident={selectedIncident}
      actionLog={actionLog}
      linkedDuplicates={linkedDuplicates}
      statusMutationPending={statusMutation.isPending}
      onRequestAction={requestStatusUpdate}
      isDisclosed={isDisclosed}
      onDisclosedChange={(value) => {
        setIsDisclosed(value);
        if (!value) setIsMediaDisclosed(false);
      }}
      isLocationFuzzed={isLocationFuzzed}
      onLocationFuzzedChange={setIsLocationFuzzed}
      isMediaDisclosed={isMediaDisclosed}
      onMediaDisclosedChange={setIsMediaDisclosed}
      closureOutcome={closureOutcome}
      onClosureOutcomeChange={setClosureOutcome}
      caseId={caseId}
      onCaseIdChange={setCaseId}
      officerNotes={officerNotes}
      onOfficerNotesChange={setOfficerNotes}
      onRequestDisclosureUpdate={(incident) =>
        requestDisclosureUpdate(incident)
      }
    />
  );

  return (
    <>
      <style>{leStyles}</style>
      <div
        className="lei-root"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div className="lei-topbar">
          <div className="lei-topbar-title">
            <Shield
              size={16}
              style={{ color: "var(--le-blue)", flexShrink: 0 }}
            />
            <span className="lei-topbar-title-text">Law Enforcement Operations</span>
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
              onSelectIncident={handleSelectIncident}
            />
            {isMobile ? (
              <div className="lei-content">
                {mobileView === "list" || !selectedIncident ? (
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: 0,
                      overflow: "hidden",
                    }}
                  >
                    {incidentQueueEl}
                  </div>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 0,
                      minHeight: 0,
                      overflow: "hidden",
                    }}
                  >
                    <div className="lei-mobile-subbar">
                      <button
                        type="button"
                        className="lei-mobile-back"
                        onClick={() => setMobileView("list")}
                      >
                        <ArrowLeft size={13} />
                        Queue
                      </button>
                      <div className="lei-mobile-tabs">
                        <button
                          type="button"
                          className={mobileTab === "detail" ? "active" : ""}
                          onClick={() => setMobileTab("detail")}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          className={mobileTab === "messages" ? "active" : ""}
                          onClick={() => setMobileTab("messages")}
                        >
                          Messages
                        </button>
                      </div>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                      {mobileTab === "detail" ? (
                        incidentDetailEl
                      ) : (
                        <IncidentTimeline
                          incidentId={selectedIncident?.id || null}
                          allowInternal={false}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
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
                    {incidentQueueEl}
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
                    {incidentDetailEl}
                  </div>

                  {!isTimelineCollapsed ? (
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="Resize detail and messages panels"
                      tabIndex={0}
                      aria-valuemin={LEI_COMMS_WIDTH.min}
                      aria-valuemax={LEI_COMMS_WIDTH.max}
                      aria-valuenow={Math.round(commsPanelWidth)}
                      className={`lei-splitter${isCommsSplitterActive ? " active" : ""}`}
                      onPointerDown={handleCommsSplitterPointerDown}
                      onKeyDown={handleCommsSplitterKeyDown}
                    />
                  ) : null}

                  <TimelineCommsPanel
                    incidentId={selectedIncident?.id || null}
                    collapsed={isTimelineCollapsed}
                    onToggle={setIsTimelineCollapsed}
                    width={commsPanelWidth}
                    allowInternal={false}
                    emptyLabel="No incident selected"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === "map" && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <OpsMapView incidents={activeLeiIncidents} />
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
        onCancel={() => {
          setPendingTransition(null);
          syncDisclosureOptions(selectedIncident);
        }}
        onConfirm={confirmPendingTransition}
      />
    </>
  );
}

export default LawEnforcement;
