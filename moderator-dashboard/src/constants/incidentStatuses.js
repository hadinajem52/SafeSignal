export const ACTIONED_STATUSES = new Set([
  'verified',
  'dispatched',
  'on_scene',
  'investigating',
  'police_closed',
  'published',
  'resolved',
  'archived',
])

export const CLOSED_STATUSES = new Set([
  'police_closed',
  'resolved',
  'archived',
])

export const STATUS_CFG = {
  rejected: { label: 'Rejected', color: '#E5484D', border: '#E5484D' },
  police_closed: { label: 'Closed', color: '#30A46C', border: '#30A46C' },
  verified: { label: 'Verified', color: '#3B9EFF', border: '#3B9EFF' },
  submitted: { label: 'Pending', color: '#F5A623', border: '#F5A623' },
  in_review: { label: 'In Review', color: '#F5A623', border: '#F5A623' },
  dispatched: { label: 'Dispatched', color: '#3B9EFF', border: '#3B9EFF' },
  resolved: { label: 'Resolved', color: '#30A46C', border: '#30A46C' },
}

export function getStatusCfg(status) {
  return STATUS_CFG[status] || {
    label: status || 'Unknown',
    color: '#3D4F65',
    border: '#3D4F65',
  }
}

export const FUNNEL_STAGES = [
  { label: 'Received', match: () => true, color: 'var(--dac-blue)' },
  { label: 'Verified', match: s => ACTIONED_STATUSES.has(s), color: 'var(--dac-blue)' },
  {
    label: 'Dispatched',
    match: s => ['dispatched', 'on_scene', 'investigating', 'police_closed', 'resolved', 'archived'].includes(s),
    color: 'var(--dac-amber)',
  },
  {
    label: 'On Scene',
    match: s => ['on_scene', 'investigating', 'police_closed', 'resolved', 'archived'].includes(s),
    color: 'var(--dac-amber)',
  },
  { label: 'Closed', match: s => CLOSED_STATUSES.has(s), color: 'var(--dac-green)' },
]
