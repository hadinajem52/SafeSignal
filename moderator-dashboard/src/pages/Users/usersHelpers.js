import { formatDate } from '../../utils/dateUtils'

export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
}

export function calcAccuracy(verified, total) {
  if (!total) return 0
  return Math.round((verified / total) * 100)
}

export function accuracyColor(pct) {
  if (pct >= 75) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
}

export function isLowSignal(u) {
  const acc = calcAccuracy(u.verifiedReports, u.totalReports)
  return acc < 30 && u.totalReports > 2
}

export function roleChipClass(role) {
  if (role === 'moderator') return 'moderator'
  if (role === 'admin') return 'admin'
  if (role === 'law_enforcement') return 'le'
  return ''
}

export function roleLabel(role) {
  if (role === 'law_enforcement') return 'LE'
  return role
}

export function buildTimeline(u) {
  const events = []
  events.push({ text: 'Account created', meta: formatDate(u.joinedDate), color: 'var(--color-text-muted)' })
  if (u.totalReports > 0) {
    events.push({
      text: `${u.totalReports} report${u.totalReports !== 1 ? 's' : ''} submitted`,
      meta: `Since joining`,
      color: 'var(--color-primary)',
    })
  }
  if (u.verifiedReports > 0) {
    events.push({
      text: `${u.verifiedReports} report${u.verifiedReports !== 1 ? 's' : ''} verified`,
      meta: `Signal quality: ${calcAccuracy(u.verifiedReports, u.totalReports)}%`,
      color: 'var(--color-success)',
    })
  }
  if (u.rejectedReports > 0) {
    events.push({
      text: `${u.rejectedReports} report${u.rejectedReports !== 1 ? 's' : ''} rejected`,
      meta: '',
      color: 'var(--color-error)',
    })
  }
  if (u.isSuspended) {
    events.push({ text: 'Account suspended', meta: '', color: 'var(--color-error)' })
  }
  return events
}
