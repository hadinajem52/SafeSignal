import { useEffect } from "react";

export function useReportKeyboardShortcuts({
  selectedReport,
  verifyPending,
  rejectPending,
  handleEscalateRequest,
  handleRejectRequest,
  handleSelectNextReport,
}) {
  useEffect(() => {
    const handleKeydown = (event) => {
      const tag = event.target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        event.target?.isContentEditable
      ) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        handleSelectNextReport();
        return;
      }
      if (!selectedReport) return;

      if (key === "e" && !verifyPending) {
        event.preventDefault();
        handleEscalateRequest();
      }

      if (key === "r" && !rejectPending) {
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
    rejectPending,
    selectedReport,
    verifyPending,
  ]);
}
