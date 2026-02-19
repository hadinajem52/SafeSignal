// ES Module wrapper for shared incident constants
// This avoids CommonJS/ESM interop issues in the Vite build

export const SEVERITY_COLORS = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#fd7e14',
  critical: '#dc3545',
};

// Badge token name → CSS variable prefix (--color-badge-{name}-bg / text / border)
// Light-mode fallback colors inline; dark-mode picks up the CSS variables automatically.
export const STATUS_COLORS = {
  submitted: 'badge-yellow',
  in_review: 'badge-blue',
  verified: 'badge-green',
  dispatched: 'badge-blue',
  on_scene: 'badge-indigo',
  investigating: 'badge-purple',
  police_closed: 'badge-green',
  rejected: 'badge-red',
  auto_processed: 'badge-indigo',
  auto_flagged: 'badge-orange',
  needs_info: 'badge-purple',
  published: 'badge-teal',
  resolved: 'badge-gray',
  archived: 'badge-gray',
  merged: 'badge-slate',
  draft: 'badge-gray',
  default: 'badge-gray',
};

// Light-mode fallback inline styles for each badge token
export const BADGE_LIGHT_STYLES = {
  'badge-yellow': { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
  'badge-green': { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  'badge-red': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  'badge-blue': { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  'badge-purple': { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
  'badge-orange': { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' },
  'badge-gray': { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  'badge-teal': { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' },
  'badge-indigo': { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
  'badge-slate': { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
};

export const STATUS_COLORS_HEX = {
  submitted: '#6c757d',
  auto_processed: '#17a2b8',
  in_review: '#ffc107',
  verified: '#28a745',
  dispatched: '#0d6efd',
  on_scene: '#6610f2',
  investigating: '#6f42c1',
  police_closed: '#198754',
  rejected: '#dc3545',
  needs_info: '#fd7e14',
  published: '#007bff',
  resolved: '#20c997',
  archived: '#6c757d',
  auto_flagged: '#e83e8c',
  merged: '#6610f2',
  draft: '#6f42c1',
  default: '#6c757d',
};

export const STATUS_BADGE_COLORS = STATUS_COLORS_HEX;

export const INCIDENT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Pending' },
  { value: 'auto_processed', label: 'Auto Processed' },
  { value: 'auto_flagged', label: 'Auto Flagged' },
  { value: 'in_review', label: 'In Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'on_scene', label: 'On Scene' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'police_closed', label: 'Police Closed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'needs_info', label: 'Needs Info' },
  { value: 'published', label: 'Published' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
  { value: 'merged', label: 'Merged' },
];

export const STATUS_LABELS = INCIDENT_STATUSES.reduce((acc, status) => {
  acc[status.value] = status.label;
  return acc;
}, {});

export const MODERATOR_STATUS_FILTERS = [
  { value: 'all', label: 'All Reports' },
  { value: 'submitted', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

export const LEI_STATUS_FILTERS = [
  { value: 'all', label: 'All Active' },
  { value: 'verified', label: 'Pending Action' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'on_scene', label: 'On Scene' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'police_closed', label: 'Police Closed' },
];

export const CLOSURE_OUTCOMES = [
  { value: 'resolved_handled', label: 'Resolved' },
  { value: 'arrest_made', label: 'Arrest Made' },
  { value: 'false_alarm', label: 'False Alarm' },
  { value: 'report_filed', label: 'Report Filed' },
];
