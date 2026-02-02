const { SEVERITY_COLORS, STATUS_COLORS } = require('./colors');

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
  { value: 'low', label: 'Low', color: SEVERITY_COLORS.low, description: 'Minor incident, no immediate risk' },
  { value: 'medium', label: 'Medium', color: SEVERITY_COLORS.medium, description: 'Moderate concern, needs attention' },
  { value: 'high', label: 'High', color: SEVERITY_COLORS.high, description: 'Serious incident, urgent' },
  { value: 'critical', label: 'Critical', color: SEVERITY_COLORS.critical, description: 'Emergency, immediate action needed' },
];

const INCIDENT_STATUSES = [
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

const CLOSURE_OUTCOMES = [
  { value: 'resolved_handled', label: 'Resolved' },
  { value: 'arrest_made', label: 'Arrest Made' },
  { value: 'false_alarm', label: 'False Alarm' },
  { value: 'report_filed', label: 'Report Filed' },
];

const VALID_CATEGORIES = INCIDENT_CATEGORIES.map((category) => category.value);
const VALID_SEVERITIES = SEVERITY_LEVELS.map((level) => level.value);
const VALID_STATUSES = INCIDENT_STATUSES.map((status) => status.value);

const STATUS_LABELS = INCIDENT_STATUSES.reduce((acc, status) => {
  acc[status.value] = status.label;
  return acc;
}, {});


const MODERATOR_STATUS_FILTERS = [
  { value: 'all', label: 'All Reports' },
  { value: 'submitted', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

const LEI_STATUS_FILTERS = [
  { value: 'all', label: 'All Active' },
  { value: 'verified', label: 'Pending Action' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'on_scene', label: 'On Scene' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'police_closed', label: 'Police Closed' },
];

const VALID_CLOSURE_OUTCOMES = CLOSURE_OUTCOMES.map((outcome) => outcome.value);

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
  LEI_STATUS_FILTERS,
  CLOSURE_OUTCOMES,
  VALID_CLOSURE_OUTCOMES,
  SEVERITY_COLORS,
};

module.exports.default = module.exports;