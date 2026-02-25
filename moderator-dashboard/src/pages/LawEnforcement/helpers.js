import {
  STATUS_TRANSITIONS,
  UNACTIONED_AGE_THRESHOLD_MINUTES,
} from "./constants";

export function getIncidentAgeMinutes(incident) {
  const ts =
    incident?.reportedAt || incident?.incident_date || incident?.created_at;
  if (!ts) return 0;
  const diff = Date.now() - new Date(ts).getTime();
  return Number.isFinite(diff) && diff > 0 ? Math.floor(diff / 60000) : 0;
}

export function isUnactionedAged(incident) {
  return (
    incident?.status === "verified" &&
    getIncidentAgeMinutes(incident) >= UNACTIONED_AGE_THRESHOLD_MINUTES
  );
}

export function getNextWorkflowStatus(currentStatus) {
  return STATUS_TRANSITIONS[currentStatus]?.[0] || null;
}

export function canTransitionTo(incident, status) {
  if (!incident) return false;
  return (STATUS_TRANSITIONS[incident.status] || []).includes(status);
}
