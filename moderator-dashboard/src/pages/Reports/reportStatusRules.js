const ACTIONABLE_MODERATION_STATUSES = new Set([
  "submitted",
  "auto_processed",
  "auto_flagged",
  "in_review",
  "needs_info",
]);

export function canEscalateReport(report) {
  return Boolean(report && ACTIONABLE_MODERATION_STATUSES.has(report.status));
}

export function canRejectReport(report) {
  return Boolean(report && ACTIONABLE_MODERATION_STATUSES.has(report.status));
}
