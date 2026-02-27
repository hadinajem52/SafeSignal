import { useCallback, useState } from "react";

export function useBulkReportActions({
  reportsAPI,
  selectedReport,
  selectedReportIds,
  setSelectedReport,
  setSelectedReportIds,
  pushToast,
  invalidateReports,
}) {
  const [bulkActionPending, setBulkActionPending] = useState(null);
  const [bulkConfirmAction, setBulkConfirmAction] = useState(null);

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

  return {
    bulkActionPending,
    bulkConfirmAction,
    setBulkConfirmAction,
    executeBulkAction,
  };
}
