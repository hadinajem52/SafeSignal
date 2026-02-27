import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

export function useReportMutations({
  queryClient,
  reportsAPI,
  filteredReports,
  selectedReport,
  setSelectedReport,
  setSelectedReportIds,
  pushToast,
  normalizeReport,
}) {
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
  };
}
