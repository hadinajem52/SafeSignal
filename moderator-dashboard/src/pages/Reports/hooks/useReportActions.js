import { useCallback, useState } from "react";
import { useBulkReportActions } from "./useBulkReportActions";
import { useReportKeyboardShortcuts } from "./useReportKeyboardShortcuts";
import { useReportMutations } from "./useReportMutations";

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
    invalidateReports,
    handleVerify,
    handleReject,
    onMerge,
    onApplySuggestedCategory,
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
    selectedReport,
    selectedReportIds,
    setSelectedReport,
    setSelectedReportIds,
    pushToast,
    invalidateReports,
  });

  const handleEscalateRequest = useCallback(() => {
    if (!selectedReport) return;
    setSingleConfirmAction("escalate");
  }, [selectedReport]);

  const handleRejectRequest = useCallback(() => {
    if (!selectedReport) return;
    setSingleConfirmAction("reject");
  }, [selectedReport]);

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
    executeBulkAction,
    handleEscalateRequest,
    handleRejectRequest,
    executeSingleAction,
    onMerge,
    onApplySuggestedCategory,
    onOpenDuplicateCandidate,
  };
}
