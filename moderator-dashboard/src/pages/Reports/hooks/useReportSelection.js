import { useCallback, useEffect, useState } from "react";

export function useReportSelection(filteredReports) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportIds, setSelectedReportIds] = useState([]);

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

  const handleToggleSelection = useCallback((reportId) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId],
    );
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (!filteredReports.length) return;
    setSelectedReportIds((prev) =>
      prev.length === filteredReports.length
        ? []
        : filteredReports.map((r) => r.id),
    );
  }, [filteredReports]);

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

  return {
    selectedReport,
    setSelectedReport,
    selectedReportIds,
    setSelectedReportIds,
    handleToggleSelection,
    handleToggleSelectAll,
    handleSelectNextReport,
  };
}
