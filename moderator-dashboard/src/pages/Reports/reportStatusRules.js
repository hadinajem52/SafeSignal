const REJECTABLE_STATUSES = new Set([
  "submitted",
  "auto_processed",
  "auto_flagged",
  "in_review",
  "needs_info",
]);

export function canRejectReport(report) {
  return Boolean(report && REJECTABLE_STATUSES.has(report.status));
}
