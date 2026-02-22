export function severityClass(sev) {
  return sev === 'critical'
    ? 'text-purple-400'
    : sev === 'high'
    ? 'text-warning'
    : sev === 'medium'
    ? 'text-accent'
    : 'text-success'
}

export function leiStatusColor(status) {
  const map = {
    verified: 'text-warning',
    dispatched: 'text-primary',
    on_scene: 'text-info',
    investigating: 'text-purple-400',
    police_closed: 'text-success',
  }
  return map[status] || 'text-muted'
}
