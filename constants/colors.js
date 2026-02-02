const SEVERITY_COLORS = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#fd7e14',
  critical: '#dc3545',
};

const STATUS_COLORS = {
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

const STATUS_BADGE_COLORS = {
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

module.exports = {
  SEVERITY_COLORS,
  STATUS_COLORS,
  STATUS_BADGE_COLORS,
};