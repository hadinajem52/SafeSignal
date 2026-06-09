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

// Mirrors the backend activation policy: no prompts for flagged, closed, or
// otherwise terminal reports. The backend remains the source of truth.
const NON_ACTIVATABLE_CONSTELLATION_STATUSES = new Set([
  "auto_flagged",
  "rejected",
  "merged",
  "archived",
  "resolved",
  "police_closed",
]);

export function canActivateConstellation(report) {
  return Boolean(
    report && !NON_ACTIVATABLE_CONSTELLATION_STATUSES.has(report.status),
  );
}
