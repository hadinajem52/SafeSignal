import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import ConfirmDialog from "../../components/ConfirmDialog";
import IncidentTimeline from "../../components/IncidentTimeline";
import { reportsAPI } from "../../services/api";
import ReportDetail from "./ReportDetail";
import ReportFilters from "./ReportFilters";
import ReportList from "./ReportList";

// Priority score: severity is the primary sort key; age (log-scaled) is a
// tiebreaker within the same tier so stale reports don't beat newer ones.
const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
const LEFT_PANEL_WIDTH = { min: 280, max: 620, default: 380 };
const RIGHT_PANEL_WIDTH = { min: 260, max: 520, default: 300 };
const SPLITTER_WIDTH = 8;
const IDEAL_MIN_DETAIL_WIDTH = 440;

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
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [bulkActionPending, setBulkActionPending] = useState(null);
  const [bulkConfirmAction, setBulkConfirmAction] = useState(null); // 'verify' | 'reject' | null
  const [singleConfirmAction, setSingleConfirmAction] = useState(null); // 'escalate' | 'reject' | null
  const [toasts, setToasts] = useState([]);
  const [panelWidths, setPanelWidths] = useState({
    left: LEFT_PANEL_WIDTH.default,
    right: RIGHT_PANEL_WIDTH.default,
  });
  const [activeSplitter, setActiveSplitter] = useState(null); // 'left' | 'right' | null
  const panelsContainerRef = useRef(null);
  const dragStateRef = useRef(null);

  const queryClient = useQueryClient();

  const clamp = useCallback(
    (value, min, max) => Math.min(Math.max(value, min), max),
    [],
  );

  const clampPanelWidths = useCallback(
    (nextWidths, containerWidth) => {
      const availableWidth = containerWidth - SPLITTER_WIDTH * 2;
      if (availableWidth <= 0) return nextWidths;

      const maxLeftFromLayout = Math.max(
        LEFT_PANEL_WIDTH.min,
        availableWidth - RIGHT_PANEL_WIDTH.min - IDEAL_MIN_DETAIL_WIDTH,
      );
      const maxRightFromLayout = Math.max(
        RIGHT_PANEL_WIDTH.min,
        availableWidth - LEFT_PANEL_WIDTH.min - IDEAL_MIN_DETAIL_WIDTH,
      );

      let left = clamp(
        nextWidths.left,
        LEFT_PANEL_WIDTH.min,
        Math.min(LEFT_PANEL_WIDTH.max, maxLeftFromLayout),
      );
      let right = clamp(
        nextWidths.right,
        RIGHT_PANEL_WIDTH.min,
        Math.min(RIGHT_PANEL_WIDTH.max, maxRightFromLayout),
      );

      const overflow = left + right + IDEAL_MIN_DETAIL_WIDTH - availableWidth;
      if (overflow > 0) {
        const shrinkRight = Math.min(overflow, right - RIGHT_PANEL_WIDTH.min);
        right -= shrinkRight;
        const remaining = overflow - shrinkRight;
        if (remaining > 0) {
          left -= Math.min(remaining, left - LEFT_PANEL_WIDTH.min);
        }
      }

      return { left, right };
    },
    [clamp],
  );

  const handleSplitterPointerDown = useCallback(
    (side, event) => {
      if (event.button !== 0 || !panelsContainerRef.current) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragStateRef.current = {
        side,
        startX: event.clientX,
        startLeft: panelWidths.left,
        startRight: panelWidths.right,
      };
      setActiveSplitter(side);
    },
    [panelWidths.left, panelWidths.right],
  );

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

  const verifyMutation = useMutation({
    mutationFn: (id) => reportsAPI.verify(id),
  });
  const rejectMutation = useMutation({
    mutationFn: (id) => reportsAPI.reject(id, "Rejected by moderator"),
  });

  const linkDuplicateMutation = useMutation({
    mutationFn: (duplicateIncidentId) =>
      reportsAPI.linkDuplicate(selectedReport.id, duplicateIncidentId),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (category) =>
      reportsAPI.updateCategory(selectedReport.id, category),
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

  useEffect(() => {
    if (!activeSplitter) return;

    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || !panelsContainerRef.current) return;
      if (event.buttons === 0) {
        dragStateRef.current = null;
        setActiveSplitter(null);
        return;
      }

      const containerWidth =
        panelsContainerRef.current.getBoundingClientRect().width;
      const deltaX = event.clientX - dragState.startX;

      const nextWidths =
        dragState.side === "left"
          ? { left: dragState.startLeft + deltaX, right: dragState.startRight }
          : { left: dragState.startLeft, right: dragState.startRight - deltaX };

      setPanelWidths(clampPanelWidths(nextWidths, containerWidth));
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      setActiveSplitter(null);
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("blur", handlePointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handlePointerUp);
    };
  }, [activeSplitter, clampPanelWidths]);

  useEffect(() => {
    const handleResize = () => {
      if (!panelsContainerRef.current) return;
      const width = panelsContainerRef.current.getBoundingClientRect().width;
      setPanelWidths((prev) => clampPanelWidths(prev, width));
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPanelWidths]);

  // Auto-select first report when list loads so the right panel isn't blank
  useEffect(() => {
    if (!selectedReport && filteredReports.length > 0) {
      setSelectedReport(filteredReports[0]);
    }
  }, [filteredReports, selectedReport]);

  // Keep selection valid if filters remove the currently selected report
  useEffect(() => {
    setSelectedReportIds((prev) =>
      prev.filter((id) => filteredReports.some((r) => r.id === id)),
    );
  }, [filteredReports]);

  const invalidateReports = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["reports"] });
  }, [queryClient]);

  const handleVerify = useCallback(
    async (reportId, source = "single") => {
      const result = await verifyMutation.mutateAsync(reportId);
      if (!result.success) {
        pushToast(result.error || "Failed to escalate report.", "error");
        return false;
      }
      invalidateReports();
      setSelectedReportIds((prev) => prev.filter((id) => id !== reportId));
      if (selectedReport?.id === reportId) setSelectedReport(null);
      if (source === "single") pushToast("Report escalated successfully.");
      return true;
    },
    [invalidateReports, pushToast, selectedReport?.id, verifyMutation],
  );

  const handleReject = useCallback(
    async (reportId, source = "single") => {
      const result = await rejectMutation.mutateAsync(reportId);
      if (!result.success) {
        pushToast(result.error || "Failed to reject report.", "error");
        return false;
      }
      invalidateReports();
      setSelectedReportIds((prev) => prev.filter((id) => id !== reportId));
      if (selectedReport?.id === reportId) setSelectedReport(null);
      if (source === "single") pushToast("Report rejected successfully.");
      return true;
    },
    [invalidateReports, pushToast, rejectMutation, selectedReport?.id],
  );

  // Called after confirmation dialog is confirmed
  const executeBulkAction = async (action) => {
    if (!selectedReportIds.length || bulkActionPending) return;
    setBulkActionPending(action);
    try {
      const actionFn =
        action === "verify"
          ? reportsAPI.verify
          : (id) => reportsAPI.reject(id, "Rejected by moderator");

      const outcomes = await Promise.all(
        selectedReportIds.map((id) => actionFn(id)),
      );
      const successCount = outcomes.filter((r) => r.success).length;
      const failedCount = outcomes.length - successCount;

      if (successCount > 0) {
        invalidateReports();
        setSelectedReportIds([]);
        if (selectedReport && selectedReportIds.includes(selectedReport.id)) {
          setSelectedReport(null);
        }
      }

      if (failedCount === 0) {
        pushToast(
          `${successCount} reports ${action === "verify" ? "escalated" : "rejected"} successfully.`,
        );
      } else {
        pushToast(
          `${successCount} succeeded, ${failedCount} failed during bulk ${action}.`,
          failedCount === outcomes.length ? "error" : "warning",
        );
      }
    } catch {
      pushToast(`Bulk ${action} failed. Please try again.`, "error");
    } finally {
      setBulkActionPending(null);
    }
  };

  const handleToggleSelection = (reportId) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId],
    );
  };

  const handleToggleSelectAll = () => {
    if (!filteredReports.length) return;
    setSelectedReportIds(
      selectedReportIds.length === filteredReports.length
        ? []
        : filteredReports.map((r) => r.id),
    );
  };

  const handleSelectNextReport = useCallback(() => {
    if (!filteredReports.length) return;
    if (!selectedReport) {
      setSelectedReport(filteredReports[0]);
      return;
    }
    const idx = filteredReports.findIndex((r) => r.id === selectedReport.id);
    setSelectedReport(
      filteredReports[idx < 0 ? 0 : (idx + 1) % filteredReports.length],
    );
  }, [filteredReports, selectedReport]);

  // Single-report action request — opens the AlertDialog
  const handleEscalateRequest = useCallback(() => {
    if (!selectedReport) return;
    setSingleConfirmAction("escalate");
  }, [selectedReport]);

  const handleRejectRequest = useCallback(() => {
    if (!selectedReport) return;
    setSingleConfirmAction("reject");
  }, [selectedReport]);

  const executeSingleAction = async () => {
    if (!selectedReport || !singleConfirmAction) return;
    const action = singleConfirmAction;
    setSingleConfirmAction(null);
    if (action === "escalate") await handleVerify(selectedReport.id);
    else await handleReject(selectedReport.id);
  };

  // Keyboard shortcuts — E escalate (dialog), R reject (dialog), N next
  useEffect(() => {
    const handleKeydown = (event) => {
      const tag = event.target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        event.target?.isContentEditable
      )
        return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        handleSelectNextReport();
        return;
      }
      if (!selectedReport) return;
      if (key === "e" && !verifyMutation.isPending) {
        event.preventDefault();
        handleEscalateRequest();
      }
      if (key === "r" && !rejectMutation.isPending) {
        event.preventDefault();
        handleRejectRequest();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [
    handleEscalateRequest,
    handleRejectRequest,
    handleSelectNextReport,
    rejectMutation.isPending,
    selectedReport,
    verifyMutation.isPending,
  ]);

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
              onMerge={async (duplicateIncidentId) => {
                const result =
                  await linkDuplicateMutation.mutateAsync(duplicateIncidentId);
                if (!result.success) {
                  pushToast(
                    result.error || "Failed to merge duplicate.",
                    "error",
                  );
                  return;
                }
                queryClient.invalidateQueries({ queryKey: ["reports"] });
                queryClient.invalidateQueries({
                  queryKey: ["report-dedup", selectedReport?.id],
                });
                pushToast("Duplicate linked successfully.");
              }}
              onApplySuggestedCategory={async (category) => {
                const result =
                  await updateCategoryMutation.mutateAsync(category);
                if (!result.success) {
                  pushToast(
                    result.error || "Failed to update category.",
                    "error",
                  );
                  return;
                }
                queryClient.invalidateQueries({ queryKey: ["reports"] });
                queryClient.invalidateQueries({
                  queryKey: ["report-ml", selectedReport?.id],
                });
                pushToast("Category updated successfully.");
              }}
              onVerify={handleEscalateRequest}
              onReject={handleRejectRequest}
              onNext={handleSelectNextReport}
              onOpenDuplicateCandidate={async (duplicateIncidentId) => {
                const duplicateId = Number(duplicateIncidentId);
                if (!Number.isFinite(duplicateId)) {
                  pushToast(
                    "Unable to open duplicate incident: invalid incident id.",
                    "error",
                  );
                  return;
                }
                const inQueue = filteredReports.find(
                  (r) => Number(r.id) === duplicateId,
                );
                if (inQueue) {
                  setSelectedReport(inQueue);
                  return;
                }
                const result = await reportsAPI.getById(duplicateId);
                if (!result.success || !result.data) {
                  pushToast(
                    result.error || "Failed to open duplicate incident.",
                    "error",
                  );
                  return;
                }
                setSelectedReport(normalizeReport(result.data));
              }}
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
