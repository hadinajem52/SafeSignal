import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import ConfirmDialog from "../../components/ConfirmDialog";
import TimelineCommsPanel from "../../components/TimelineCommsPanel";
import { reportsAPI } from "../../services/api";
import { getConstellationPriorityBoost } from "../../utils/constellationUtils";
import ReportDetail from "./ReportDetail";
import ReportFilters from "./ReportFilters";
import ReportList from "./ReportList";
import useAwaitingReply from "../../hooks/useAwaitingReply";
import { useReportPanelResize } from "./hooks/useReportPanelResize";
import { useReportSelection } from "./hooks/useReportSelection";
import { useReportActions } from "./hooks/useReportActions";
import {
  canActivateConstellation,
  canEscalateReport,
  canRejectReport,
} from "./reportStatusRules";

// Priority score: severity is the primary sort key; age (log-scaled) is a
// tiebreaker within the same tier so stale reports don't beat newer ones.
const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

function getPriorityScore(report) {
  const rank = SEVERITY_RANK[report.severity] || 0;
  const ageHours =
    (Date.now() - new Date(report.createdAt).getTime()) / 3_600_000;
  // Multiply rank by 1000 so no age difference can push a lower tier above a higher one
  return (
    rank * 1000 +
    getConstellationPriorityBoost(report.constellation) +
    Math.log(Math.max(ageHours, 0.01) + 1)
  );
}

function normalizeReport(incident) {
  return {
    ...incident,
    id: incident.incident_id,
    reporter: incident.username || "Anonymous",
    location:
      incident.location_name || `${incident.latitude}, ${incident.longitude}`,
    createdAt: incident.created_at || incident.incident_date,
  };
}

function Reports() {
  // Default to the combined 'Needs Review' view so auto_flagged reports are visible
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    "submitted,auto_flagged,auto_processed",
  );
  const [sortMode, setSortMode] = useState("urgency"); // 'urgency' | 'time'
  const [toasts, setToasts] = useState([]);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [parentReportReturn, setParentReportReturn] = useState(null);

  const queryClient = useQueryClient();
  const { data: awaitingReplyIds } = useAwaitingReply();

  const pushToast = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    const duration = type === "error" ? 5000 : 3200;
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      duration,
    );
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", statusFilter],
    queryFn: async () => {
      const params =
        statusFilter !== "all"
          ? { status: statusFilter, include_constellation: true }
          : { include_constellation: true };
      const result = await reportsAPI.getAll(params);
      return result.success ? result.data : [];
    },
  });

  const filteredReports = useMemo(() => {
    const q = searchTerm.toLowerCase();
    // Build a set so multi-value filters like 'submitted,auto_flagged' work correctly
    const activeStatuses =
      statusFilter === "all"
        ? null
        : new Set(statusFilter.split(",").map((s) => s.trim()));

    return reports
      .filter((report) => {
        const matchesSearch =
          report.title.toLowerCase().includes(q) ||
          report.description.toLowerCase().includes(q);
        const matchesStatus =
          !activeStatuses || activeStatuses.has(report.status);
        return matchesSearch && matchesStatus;
      })
      .map(normalizeReport)
      .sort((a, b) =>
        sortMode === "time"
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : getPriorityScore(b) - getPriorityScore(a),
      );
  }, [reports, searchTerm, statusFilter, sortMode]);

  const {
    panelWidths,
    activeSplitter,
    panelsContainerRef,
    handleSplitterPointerDown,
  } = useReportPanelResize();

  const {
    selectedReport,
    setSelectedReport,
    selectedReportIds,
    setSelectedReportIds,
    handleToggleSelection,
    handleToggleSelectAll,
    handleSelectNextReport,
  } = useReportSelection(filteredReports);

  const handleSelectNextReportFromHeader = useCallback(() => {
    setParentReportReturn(null);
    handleSelectNextReport();
  }, [handleSelectNextReport]);

  const { data: dedupData, isLoading: isDedupLoading } = useQuery({
    queryKey: ["report-dedup", selectedReport?.id],
    queryFn: async () => {
      if (!selectedReport?.id) return null;
      const result = await reportsAPI.getDedup(selectedReport.id);
      return result.success ? result.data : null;
    },
    enabled: Boolean(selectedReport?.id),
  });

  const { data: mlSummary, isLoading: isMlLoading } = useQuery({
    queryKey: ["report-ml", selectedReport?.id],
    queryFn: async () => {
      if (!selectedReport?.id) return null;
      const result = await reportsAPI.getMlSummary(selectedReport.id);
      return result.success ? result.data : null;
    },
    enabled: Boolean(selectedReport?.id),
    refetchInterval: (query) =>
      query.state.data?.mediaJudgmentStatus === "pending" ? 3000 : false,
  });

  // While a constellation is active for the selected report, poll its corroboration
  // results so the moderator sees the witness feedback update in place.
  const { data: liveConstellation } = useQuery({
    queryKey: ["report-constellation", selectedReport?.id],
    queryFn: async () => {
      if (!selectedReport?.id) return null;
      const result = await reportsAPI.getById(selectedReport.id);
      // Throw on failure so a transient error keeps the last-known constellation
      // instead of collapsing to null (which would hide an active one and wrongly
      // re-show the activation CTA).
      if (!result.success) {
        throw new Error(result.error || "Failed to load constellation");
      }
      return result.data?.constellation ?? null;
    },
    enabled: Boolean(selectedReport?.id) && Boolean(selectedReport?.constellation),
    refetchInterval: (query) =>
      query.state.data?.status === "active" ? 10000 : false,
  });

  const detailConstellation =
    liveConstellation !== undefined
      ? liveConstellation
      : selectedReport?.constellation ?? null;

  const {
    bulkActionPending,
    bulkConfirmAction,
    singleConfirmAction,
    setBulkConfirmAction,
    setSingleConfirmAction,
    verifyMutation,
    rejectMutation,
    linkDuplicateMutation,
    updateCategoryMutation,
    retryMediaJudgmentMutation,
    activateConstellationMutation,
    executeBulkAction,
    handleEscalateRequest,
    handleRejectRequest,
    executeSingleAction,
    onMerge,
    onApplySuggestedCategory,
    onRetryMediaJudgment,
    onActivateConstellation,
    onOpenDuplicateCandidate,
  } = useReportActions({
    queryClient,
    reportsAPI,
    filteredReports,
    selectedReport,
    setSelectedReport,
    selectedReportIds,
    setSelectedReportIds,
    handleSelectNextReport: handleSelectNextReportFromHeader,
    pushToast,
    normalizeReport,
  });

  const rejectableSelectedCount = selectedReportIds.filter((id) =>
    canRejectReport(filteredReports.find((report) => report.id === id)),
  ).length;
  const escalatableSelectedCount = selectedReportIds.filter((id) =>
    canEscalateReport(filteredReports.find((report) => report.id === id)),
  ).length;

  const handleSelectReport = useCallback(
    (report) => {
      setParentReportReturn(null);
      setSelectedReport(report);
    },
    [setSelectedReport],
  );

  const handleOpenDuplicateFromDetail = useCallback(
    async (duplicateIncidentId) => {
      const sourceReport = parentReportReturn || selectedReport;
      const opened = await onOpenDuplicateCandidate(duplicateIncidentId);
      if (
        opened
        && sourceReport?.id
        && Number(sourceReport.id) !== Number(duplicateIncidentId)
      ) {
        setParentReportReturn({
          id: sourceReport.id,
          title: sourceReport.title,
        });
      }
    },
    [onOpenDuplicateCandidate, parentReportReturn, selectedReport],
  );

  const handleReturnToParentReport = useCallback(async () => {
    if (!parentReportReturn?.id) return;
    const opened = await onOpenDuplicateCandidate(parentReportReturn.id);
    if (opened) setParentReportReturn(null);
  }, [onOpenDuplicateCandidate, parentReportReturn]);

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-bg">
      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[280px] max-w-[420px] border px-4 py-3 shadow-soft pointer-events-auto ${
              toast.type === "error"
                ? "border-danger/40 bg-surface text-danger"
                : toast.type === "warning"
                  ? "border-warning/40 bg-surface text-warning"
                  : "border-success/40 bg-surface text-success"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* ── Topbar ── */}
      <div className="flex-shrink-0 flex items-center h-[61px] px-6 bg-surface border-b border-border">
        <div className="flex items-center gap-2.5 mr-8 font-display font-extrabold text-[17px] tracking-wide uppercase text-text flex-shrink-0">
          <FileText size={14} />
          Reports Queue
        </div>
        <div className="ml-auto flex items-center gap-4 text-[11px] text-muted font-medium flex-shrink-0">
          {[
            ["E", "escalate"],
            ["R", "reject"],
            ["N", "next"],
          ].map(([key, action]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <kbd className="inline-flex items-center justify-center w-5 h-5 border border-border bg-surface2 font-mono font-bold text-text text-[10px] rounded-none">
                {key}
              </kbd>
              {action}
            </span>
          ))}
        </div>
      </div>

      {/* ── Toolbar (filters) ── */}
      <ReportFilters
        searchTerm={searchTerm}
        onSearchChange={(event) => setSearchTerm(event.target.value)}
        statusFilter={statusFilter}
        onStatusFilterChange={(event) => setStatusFilter(event.target.value)}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        totalResults={filteredReports.length}
        selectedCount={selectedReportIds.length}
        bulkActionPending={bulkActionPending}
        canBulkVerify={escalatableSelectedCount > 0}
        canBulkReject={rejectableSelectedCount > 0}
        onBulkVerify={() => setBulkConfirmAction("verify")}
        onBulkReject={() => setBulkConfirmAction("reject")}
      />

      {/* ── Three-panel body ── */}
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
        <div ref={panelsContainerRef} className="flex flex-1 min-w-[936px]">
          {/* Panel 1: report list */}
          <div
            style={{ width: `${panelWidths.left}px` }}
            className="flex-shrink-0 border-r border-border overflow-hidden flex flex-col"
          >
            <ReportList
              reports={filteredReports}
              isLoading={isLoading}
              selectedReportId={selectedReport?.id ?? null}
              onSelectReport={handleSelectReport}
              selectedReportIds={selectedReportIds}
              onToggleSelection={handleToggleSelection}
              onToggleSelectAll={handleToggleSelectAll}
              unreadReportIds={awaitingReplyIds}
            />
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize report list and detail panels"
            onPointerDown={(event) => handleSplitterPointerDown("left", event)}
            className={`flex-shrink-0 w-px cursor-col-resize touch-none ${activeSplitter === "left" ? "bg-primary" : "bg-border hover:bg-border/70"}`}
          />

          {/* Panel 2: report detail */}
          <div className="flex-1 overflow-hidden min-w-0">
            <ReportDetail
              report={selectedReport}
              constellation={detailConstellation}
              onActivateConstellation={onActivateConstellation}
              activateConstellationPending={activateConstellationMutation.isPending}
              canActivateConstellation={canActivateConstellation(selectedReport)}
              mlSummary={mlSummary}
              isMlLoading={isMlLoading}
              dedupData={dedupData}
              isDedupLoading={isDedupLoading}
              isMerging={linkDuplicateMutation.isPending}
              updateCategoryPending={updateCategoryMutation.isPending}
              verifyPending={verifyMutation.isPending}
              rejectPending={rejectMutation.isPending}
              retryMediaJudgmentPending={retryMediaJudgmentMutation.isPending}
              canVerify={canEscalateReport(selectedReport)}
              canReject={canRejectReport(selectedReport)}
              onMerge={onMerge}
              onApplySuggestedCategory={onApplySuggestedCategory}
              onRetryMediaJudgment={onRetryMediaJudgment}
              onVerify={handleEscalateRequest}
              onReject={handleRejectRequest}
              onNext={handleSelectNextReportFromHeader}
              onOpenDuplicateCandidate={handleOpenDuplicateFromDetail}
              parentReport={parentReportReturn}
              onReturnToParent={handleReturnToParentReport}
            />
          </div>

          {!isTimelineCollapsed ? (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize report detail and timeline panels"
              onPointerDown={(event) => handleSplitterPointerDown("right", event)}
              className={`flex-shrink-0 w-px cursor-col-resize touch-none ${activeSplitter === "right" ? "bg-primary" : "bg-border hover:bg-border/70"}`}
            />
          ) : null}

          {/* Panel 3: timeline */}
          <TimelineCommsPanel
            incidentId={selectedReport?.id || null}
            collapsed={isTimelineCollapsed}
            onToggle={setIsTimelineCollapsed}
            width={panelWidths.right}
            emptyLabel="No report selected"
          />
        </div>
      </div>

      {/* Single-report action confirmation */}
      <ConfirmDialog
        visible={Boolean(singleConfirmAction)}
        title={
          singleConfirmAction === "escalate"
            ? "Escalate this report?"
            : "Reject this report?"
        }
        message={
          singleConfirmAction === "escalate"
            ? "This will mark the report as verified and forward it to law enforcement. This cannot be undone."
            : "This will permanently reject the report. This cannot be undone."
        }
        confirmLabel={
          singleConfirmAction === "escalate" ? "Escalate" : "Reject"
        }
        confirmClassName={
          singleConfirmAction === "escalate"
            ? "border border-success/60 text-success hover:bg-success/10"
            : "border border-danger/60 text-danger hover:bg-danger/10"
        }
        confirmDisabled={verifyMutation.isPending || rejectMutation.isPending}
        onCancel={() => setSingleConfirmAction(null)}
        onConfirm={executeSingleAction}
      />

      {/* Bulk action confirmation */}
      <ConfirmDialog
        visible={Boolean(bulkConfirmAction)}
        title={`Bulk ${bulkConfirmAction === "verify" ? "Escalate" : "Reject"} ${selectedReportIds.length} report${selectedReportIds.length !== 1 ? "s" : ""}?`}
        message={
          bulkConfirmAction === "verify"
            ? `This will escalate ${escalatableSelectedCount} selected report${escalatableSelectedCount !== 1 ? "s" : ""} and forward them to law enforcement. Ineligible reports will be skipped.`
            : `This will reject ${rejectableSelectedCount} selected report${rejectableSelectedCount !== 1 ? "s" : ""}. Ineligible reports will be skipped.`
        }
        confirmLabel={
          bulkConfirmAction === "verify" ? "Escalate All" : "Reject All"
        }
        confirmClassName={
          bulkConfirmAction === "verify"
            ? "border border-success/60 text-success hover:bg-success/10"
            : "border border-danger/60 text-danger hover:bg-danger/10"
        }
        confirmDisabled={
          Boolean(bulkActionPending) ||
          (bulkConfirmAction === "verify" && escalatableSelectedCount === 0) ||
          (bulkConfirmAction === "reject" && rejectableSelectedCount === 0)
        }
        onCancel={() => setBulkConfirmAction(null)}
        onConfirm={() => {
          const action = bulkConfirmAction;
          setBulkConfirmAction(null);
          executeBulkAction(action);
        }}
      />
    </div>
  );
}

export default Reports;
