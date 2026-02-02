// ES Module wrapper for shared incident constants
// This avoids CommonJS/ESM interop issues in the Vite build

export const SEVERITY_COLORS = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#fd7e14',
  critical: '#dc3545',
};

export const STATUS_COLORS = {
  submitted: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  verified: 'bg-green-100 text-green-800',
  dispatched: 'bg-blue-100 text-blue-800',
  on_scene: 'bg-indigo-100 text-indigo-800',
  investigating: 'bg-purple-100 text-purple-800',
  police_closed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  auto_processed: 'bg-indigo-100 text-indigo-800',
  auto_flagged: 'bg-orange-100 text-orange-800',
  needs_info: 'bg-purple-100 text-purple-800',
  published: 'bg-teal-100 text-teal-800',
  resolved: 'bg-gray-200 text-gray-800',
  archived: 'bg-gray-100 text-gray-800',
  merged: 'bg-slate-100 text-slate-800',
  draft: 'bg-gray-100 text-gray-800',
  default: 'bg-gray-100 text-gray-800',
};

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
