import React from 'react'
import { SEVERITY_VARIANTS } from '../utils/incident'

const SEVERITY_STYLES = {
  low: {
    pill: 'bg-[var(--color-badge-green-bg,#dcfce7)] text-[var(--color-badge-green-text,#166534)] border border-[var(--color-badge-green-border,#bbf7d0)]',
    color: 'text-success',
    letter: 'text-success',
  },
  medium: {
    pill: 'bg-[var(--color-badge-yellow-bg,#fef9c3)] text-[var(--color-badge-yellow-text,#854d0e)] border border-[var(--color-badge-yellow-border,#fde68a)]',
    color: 'text-warning',
    letter: 'text-warning',
  },
  high: {
    pill: 'bg-[var(--color-badge-red-bg,#fee2e2)] text-[var(--color-badge-red-text,#991b1b)] border border-[var(--color-badge-red-border,#fecaca)]',
    color: 'text-error',
    letter: 'text-error',
  },
  critical: {
    pill: 'bg-[var(--color-badge-red-bg,#fee2e2)] text-[var(--color-badge-red-text,#991b1b)] border border-[var(--color-badge-red-border,#fecaca)]',
    color: 'text-error',
    letter: 'text-error',
  },
}

const DEFAULT_STYLE = {
  pill: 'bg-[var(--color-badge-gray-bg,#f1f5f9)] text-[var(--color-badge-gray-text,#475569)] border border-[var(--color-badge-gray-border,#e2e8f0)]',
  color: 'text-muted',
  letter: 'text-muted',
}

function SeverityBadge({ severity, variant = SEVERITY_VARIANTS.REPORTS, display = 'pill' }) {
  const safeSeverity = severity || 'unknown'
  const styles = SEVERITY_STYLES[safeSeverity] || DEFAULT_STYLE

  if (display === 'initial') {
    return (
      <div className={`text-2xl font-extrabold ${styles.letter}`}>
        {safeSeverity.charAt(0).toUpperCase()}
      </div>
    )
  }

  if (display === 'text') {
    return <span className={`font-semibold capitalize ${styles.color}`}>{safeSeverity}</span>
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${styles.pill}`}>
      {safeSeverity.toUpperCase()}
    </span>
  )
}

export default SeverityBadge
