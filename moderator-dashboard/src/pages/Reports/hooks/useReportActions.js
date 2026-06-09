import { useCallback, useState } from "react";
import { useBulkReportActions } from "./useBulkReportActions";
import { useReportKeyboardShortcuts } from "./useReportKeyboardShortcuts";
import { useReportMutations } from "./useReportMutations";
import { canEscalateReport, canRejectReport } from "../reportStatusRules";

export function useReportActions({
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
}) {
  const [singleConfirmAction, setSingleConfirmAction] = useState(null);

  const {
    verifyMutation,
    rejectMutation,
    linkDuplicateMutation,
    updateCategoryMutation,
    retryMediaJudgmentMutation,
    activateConstellationMutation,
    invalidateReports,
    handleVerify,
    handleReject,
    onMerge,
    onApplySuggestedCategory,
    onRetryMediaJudgment,
    onActivateConstellation,
    onOpenDuplicateCandidate,
  } = useReportMutations({
    queryClient,
    reportsAPI,
    filteredReports,
    selectedReport,
    setSelectedReport,
    setSelectedReportIds,
    pushToast,
    normalizeReport,
  });

  const {
    bulkActionPending,
    bulkConfirmAction,
    setBulkConfirmAction,
    executeBulkAction,
  } = useBulkReportActions({
    reportsAPI,
    filteredReports,
    selectedReport,
    selectedReportIds,
    setSelectedReport,
    setSelectedReportIds,
    pushToast,
    invalidateReports,
  });

  const handleEscalateRequest = useCallback(() => {
    if (!selectedReport) return;
    if (!canEscalateReport(selectedReport)) {
      pushToast(`Cannot escalate a report with status ${selectedReport.status}.`, "warning");
      return;
    }
    setSingleConfirmAction("escalate");
  }, [pushToast, selectedReport]);

  const handleRejectRequest = useCallback(() => {
    if (!selectedReport) return;
    if (!canRejectReport(selectedReport)) {
      pushToast(`Cannot reject a report with status ${selectedReport.status}.`, "warning");
      return;
    }
    setSingleConfirmAction("reject");
  }, [pushToast, selectedReport]);

  const executeSingleAction = useCallback(async () => {
    if (!selectedReport || !singleConfirmAction) return;
    const action = singleConfirmAction;
    setSingleConfirmAction(null);
    if (action === "escalate") await handleVerify(selectedReport.id);
    else await handleReject(selectedReport.id);
  }, [handleReject, handleVerify, selectedReport, singleConfirmAction]);

  useReportKeyboardShortcuts({
    selectedReport,
    verifyPending: verifyMutation.isPending,
    rejectPending: rejectMutation.isPending,
    canEscalateSelectedReport: canEscalateReport(selectedReport),
    canRejectSelectedReport: canRejectReport(selectedReport),
    handleEscalateRequest,
    handleRejectRequest,
    handleSelectNextReport,
  });

  return {
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
  };
}
