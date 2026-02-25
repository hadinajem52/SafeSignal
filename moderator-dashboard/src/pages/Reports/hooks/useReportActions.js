import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

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
  const [bulkActionPending, setBulkActionPending] = useState(null);
  const [bulkConfirmAction, setBulkConfirmAction] = useState(null); // 'verify' | 'reject' | null
  const [singleConfirmAction, setSingleConfirmAction] = useState(null); // 'escalate' | 'reject' | null

  const verifyMutation = useMutation({
    mutationFn: (id) => reportsAPI.verify(id),
  });
  const rejectMutation = useMutation({
    mutationFn: (id) => reportsAPI.reject(id, "Rejected by moderator"),
  });
  const linkDuplicateMutation = useMutation({
    mutationFn: ({ reportId, duplicateIncidentId }) =>
      reportsAPI.linkDuplicate(reportId, duplicateIncidentId),
  });
  const updateCategoryMutation = useMutation({
    mutationFn: ({ reportId, category }) =>
      reportsAPI.updateCategory(reportId, category),
  });

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
    [
      invalidateReports,
      pushToast,
      selectedReport?.id,
      setSelectedReport,
      setSelectedReportIds,
      verifyMutation,
    ],
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
    [
      invalidateReports,
      pushToast,
      rejectMutation,
      selectedReport?.id,
      setSelectedReport,
      setSelectedReportIds,
    ],
  );

  const executeBulkAction = useCallback(
    async (action) => {
      if (!selectedReportIds.length || bulkActionPending) return;
      setBulkActionPending(action);
      try {
        const actionFn =
          action === "verify"
            ? reportsAPI.verify
            : (id) => reportsAPI.reject(id, "Rejected by moderator");

        const outcomes = await Promise.all(selectedReportIds.map((id) => actionFn(id)));
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
    },
    [
      bulkActionPending,
      invalidateReports,
      pushToast,
      reportsAPI,
      selectedReport,
      selectedReportIds,
      setSelectedReport,
      setSelectedReportIds,
    ],
  );

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

  const onMerge = useCallback(
    async (duplicateIncidentId) => {
      if (!selectedReport?.id) return;
      const result = await linkDuplicateMutation.mutateAsync({
        reportId: selectedReport.id,
        duplicateIncidentId,
      });
      if (!result.success) {
        pushToast(result.error || "Failed to merge duplicate.", "error");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({
        queryKey: ["report-dedup", selectedReport?.id],
      });
      pushToast("Duplicate linked successfully.");
    },
    [linkDuplicateMutation, pushToast, queryClient, selectedReport?.id],
  );

  const onApplySuggestedCategory = useCallback(
    async (category) => {
      if (!selectedReport?.id) return;
      const result = await updateCategoryMutation.mutateAsync({
        reportId: selectedReport.id,
        category,
      });
      if (!result.success) {
        pushToast(result.error || "Failed to update category.", "error");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({
        queryKey: ["report-ml", selectedReport?.id],
      });
      pushToast("Category updated successfully.");
    },
    [pushToast, queryClient, selectedReport?.id, updateCategoryMutation],
  );

  const onOpenDuplicateCandidate = useCallback(
    async (duplicateIncidentId) => {
      const duplicateId = Number(duplicateIncidentId);
      if (!Number.isFinite(duplicateId)) {
        pushToast("Unable to open duplicate incident: invalid incident id.", "error");
        return;
      }
      const inQueue = filteredReports.find((r) => Number(r.id) === duplicateId);
      if (inQueue) {
        setSelectedReport(inQueue);
        return;
      }
      const result = await reportsAPI.getById(duplicateId);
      if (!result.success || !result.data) {
        pushToast(result.error || "Failed to open duplicate incident.", "error");
        return;
      }
      setSelectedReport(normalizeReport(result.data));
    },
    [filteredReports, normalizeReport, pushToast, reportsAPI, setSelectedReport],
  );

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
