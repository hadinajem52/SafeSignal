import React, { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import ConfirmDialog from "../../components/ConfirmDialog";
import IncidentTimeline from "../../components/IncidentTimeline";
import { reportsAPI } from "../../services/api";
import ReportDetail from "./ReportDetail";
import ReportFilters from "./ReportFilters";
import ReportList from "./ReportList";
import { useReportPanelResize } from "./hooks/useReportPanelResize";
import { useReportSelection } from "./hooks/useReportSelection";
import { useReportActions } from "./hooks/useReportActions";

// Priority score: severity is the primary sort key; age (log-scaled) is a
// tiebreaker within the same tier so stale reports don't beat newer ones.
const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

function getPriorityScore(report) {
  const rank = SEVERITY_RANK[report.severity] || 0;
  const ageHours =
    (Date.now() - new Date(report.createdAt).getTime()) / 3_600_000;
  // Multiply rank by 1000 so no age difference can push a lower tier above a higher one
  return rank * 1000 + Math.log(Math.max(ageHours, 0.01) + 1);
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

  const queryClient = useQueryClient();

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
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
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
  });

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
    executeBulkAction,
    handleEscalateRequest,
    handleRejectRequest,
    executeSingleAction,
    onMerge,
    onApplySuggestedCategory,
    onOpenDuplicateCandidate,
  } = useReportActions({
    queryClient,
    reportsAPI,
    filteredReports,
    selectedReport,
    setSelectedReport,
    selectedReportIds,
    setSelectedReportIds,
    handleSelectNextReport,
    pushToast,
    normalizeReport,
  });

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
      <div className="flex-shrink-0 flex items-center h-[52px] px-6 bg-surface border-b border-border">
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
              onSelectReport={setSelectedReport}
              selectedReportIds={selectedReportIds}
              onToggleSelection={handleToggleSelection}
              onToggleSelectAll={handleToggleSelectAll}
            />
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize report list and detail panels"
            onPointerDown={(event) => handleSplitterPointerDown("left", event)}
            className={`group flex-shrink-0 w-2 cursor-col-resize touch-none bg-surface/20 hover:bg-surface/40 ${activeSplitter === "left" ? "bg-surface/50" : ""}`}
          >
            <span
              className={`mx-auto h-full w-px ${activeSplitter === "left" ? "bg-primary" : "bg-border group-hover:bg-border/70"}`}
            />
          </div>

          {/* Panel 2: report detail */}
          <div className="flex-1 overflow-hidden min-w-0">
            <ReportDetail
              report={selectedReport}
              mlSummary={mlSummary}
              isMlLoading={isMlLoading}
              dedupData={dedupData}
              isDedupLoading={isDedupLoading}
              isMerging={linkDuplicateMutation.isPending}
              updateCategoryPending={updateCategoryMutation.isPending}
              verifyPending={verifyMutation.isPending}
              rejectPending={rejectMutation.isPending}
              onMerge={onMerge}
              onApplySuggestedCategory={onApplySuggestedCategory}
              onVerify={handleEscalateRequest}
              onReject={handleRejectRequest}
              onNext={handleSelectNextReport}
              onOpenDuplicateCandidate={onOpenDuplicateCandidate}
            />
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize report detail and timeline panels"
            onPointerDown={(event) => handleSplitterPointerDown("right", event)}
            className={`group flex-shrink-0 w-2 cursor-col-resize touch-none bg-surface/20 hover:bg-surface/40 ${activeSplitter === "right" ? "bg-surface/50" : ""}`}
          >
            <span
              className={`mx-auto h-full w-px ${activeSplitter === "right" ? "bg-primary" : "bg-border group-hover:bg-border/70"}`}
            />
          </div>

          {/* Panel 3: timeline */}
          <div
            style={{ width: `${panelWidths.right}px` }}
            className="flex-shrink-0 border-l border-border overflow-hidden flex flex-col bg-surface/30"
          >
            <div className="flex-shrink-0 h-[52px] px-4 flex flex-col justify-center border-b border-border bg-surface">
              <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-text">
                Timeline &amp; Comms
              </p>
              <p className="text-[10px] text-muted mt-0.5">
                Notes &amp; reporter messages
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              {selectedReport ? (
                <IncidentTimeline incidentId={selectedReport.id} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted text-[11px] font-semibold uppercase tracking-[0.04em]">
                  No report selected
                </div>
              )}
            </div>
          </div>
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
            ? `This will escalate all ${selectedReportIds.length} selected reports and forward them to law enforcement.`
            : `This will reject all ${selectedReportIds.length} selected reports. This cannot be undone.`
        }
        confirmLabel={
          bulkConfirmAction === "verify" ? "Escalate All" : "Reject All"
        }
        confirmClassName={
          bulkConfirmAction === "verify"
            ? "border border-success/60 text-success hover:bg-success/10"
            : "border border-danger/60 text-danger hover:bg-danger/10"
        }
        confirmDisabled={Boolean(bulkActionPending)}
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
