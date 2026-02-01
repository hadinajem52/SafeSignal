const INCIDENT_CATEGORIES = [
  { value: 'theft', label: 'Theft', icon: '💰' },
  { value: 'assault', label: 'Assault', icon: '⚠️' },
  { value: 'vandalism', label: 'Vandalism', icon: '🔨' },
  { value: 'suspicious_activity', label: 'Suspicious Activity', icon: '👀' },
  { value: 'traffic_incident', label: 'Traffic Incident', icon: '🚗' },
  { value: 'noise_complaint', label: 'Noise Complaint', icon: '🔊' },
  { value: 'fire', label: 'Fire', icon: '🔥' },
  { value: 'medical_emergency', label: 'Medical Emergency', icon: '🚑' },
  { value: 'hazard', label: 'Hazard', icon: '⚠️' },
  { value: 'other', label: 'Other', icon: '📝' },
];

const CATEGORY_DISPLAY = {
  theft: {
    label: 'Theft',
    mapColor: '#E53935',
    mapIcon: 'warning',
    trendIcon: '🔓',
    trendColor: '#e74c3c',
  },
  assault: {
    label: 'Assault',
    mapColor: '#D32F2F',
    mapIcon: 'alert-circle',
    trendIcon: '⚠️',
    trendColor: '#c0392b',
  },
  vandalism: {
    label: 'Vandalism',
    mapColor: '#FF9800',
    mapIcon: 'construct',
    trendIcon: '🔨',
    trendColor: '#e67e22',
  },
  suspicious_activity: {
    label: 'Suspicious Activity',
    mapColor: '#FFC107',
    mapIcon: 'eye',
    trendIcon: '👁️',
    trendColor: '#9b59b6',
  },
  traffic_incident: {
    label: 'Traffic Incident',
    mapColor: '#2196F3',
    mapIcon: 'car',
    trendIcon: '🚗',
    trendColor: '#3498db',
  },
  noise_complaint: {
    label: 'Noise Complaint',
    mapColor: '#9C27B0',
    mapIcon: 'volume-high',
    trendIcon: '🔊',
    trendColor: '#1abc9c',
  },
  fire: {
    label: 'Fire',
    mapColor: '#FF5722',
    mapIcon: 'flame',
    trendIcon: '🔥',
    trendColor: '#e74c3c',
  },
  medical_emergency: {
    label: 'Medical Emergency',
    mapColor: '#F44336',
    mapIcon: 'medkit',
    trendIcon: '🏥',
    trendColor: '#e91e63',
  },
  hazard: {
    label: 'Hazard',
    mapColor: '#795548',
    mapIcon: 'nuclear',
    trendIcon: '☣️',
    trendColor: '#8d6e63',
  },
  other: {
    label: 'Other',
    mapColor: '#607D8B',
    mapIcon: 'help-circle',
    trendIcon: '📋',
    trendColor: '#95a5a6',
  },
};

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: '#28a745', description: 'Minor incident, no immediate risk' },
  { value: 'medium', label: 'Medium', color: '#ffc107', description: 'Moderate concern, needs attention' },
  { value: 'high', label: 'High', color: '#fd7e14', description: 'Serious incident, urgent' },
  { value: 'critical', label: 'Critical', color: '#dc3545', description: 'Emergency, immediate action needed' },
];

const INCIDENT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Pending' },
  { value: 'auto_processed', label: 'Auto Processed' },
  { value: 'auto_flagged', label: 'Auto Flagged' },
  { value: 'in_review', label: 'In Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'needs_info', label: 'Needs Info' },
  { value: 'published', label: 'Published' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
  { value: 'merged', label: 'Merged' },
];

const VALID_CATEGORIES = INCIDENT_CATEGORIES.map((category) => category.value);
const VALID_SEVERITIES = SEVERITY_LEVELS.map((level) => level.value);
const VALID_STATUSES = INCIDENT_STATUSES.map((status) => status.value);

const STATUS_LABELS = INCIDENT_STATUSES.reduce((acc, status) => {
  acc[status.value] = status.label;
  return acc;
}, {});

const STATUS_COLORS = {
  submitted: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  verified: 'bg-green-100 text-green-800',
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

const MODERATOR_STATUS_FILTERS = [
  { value: 'all', label: 'All Reports' },
  { value: 'submitted', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

module.exports = {
  INCIDENT_CATEGORIES,
  CATEGORY_DISPLAY,
  SEVERITY_LEVELS,
  INCIDENT_STATUSES,
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  VALID_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  MODERATOR_STATUS_FILTERS,
};