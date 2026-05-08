import { useCallback, useState } from "react";
import { canRejectReport } from "../reportStatusRules";

export function useBulkReportActions({
  reportsAPI,
  filteredReports,
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

      const reportsById = new Map(filteredReports.map((report) => [report.id, report]));
      const actionableIds =
        action === "reject"
          ? selectedReportIds.filter((id) => canRejectReport(reportsById.get(id)))
          : selectedReportIds;

      if (!actionableIds.length) {
        pushToast(`No selected reports can be ${action === "verify" ? "escalated" : "rejected"}.`, "warning");
        return;
      }

      setBulkActionPending(action);
      try {
        const actionFn =
          action === "verify"
            ? reportsAPI.verify
            : (id) => reportsAPI.reject(id, "Rejected by moderator");

        const outcomes = await Promise.all(actionableIds.map((id) => actionFn(id)));
        const successCount = outcomes.filter((r) => r.success).length;
        const failedCount = outcomes.length - successCount;
        const skippedCount = selectedReportIds.length - actionableIds.length;

        if (successCount > 0) {
          invalidateReports();
          setSelectedReportIds([]);
          if (selectedReport && actionableIds.includes(selectedReport.id)) {
            setSelectedReport(null);
          }
        }

        if (failedCount === 0 && skippedCount === 0) {
          pushToast(
            `${successCount} reports ${action === "verify" ? "escalated" : "rejected"} successfully.`,
          );
        } else {
          pushToast(
            `${successCount} succeeded, ${failedCount} failed, ${skippedCount} skipped during bulk ${action}.`,
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
      filteredReports,
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
