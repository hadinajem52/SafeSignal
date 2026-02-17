import React from 'react'
import { getSeverityColor, SEVERITY_VARIANTS } from '../utils/incident'

function SeverityBadge({ severity, variant = SEVERITY_VARIANTS.REPORTS, display = 'pill' }) {
  const colorClass = getSeverityColor(severity, variant)
  const safeSeverity = severity || 'unknown'

  if (display === 'initial') {
    return <div className={`text-3xl font-bold ml-4 ${colorClass}`}>{safeSeverity.charAt(0).toUpperCase()}</div>
  }

  if (display === 'text') {
    return <span className={`font-medium capitalize ${colorClass}`}>{safeSeverity}</span>
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium bg-surface ${colorClass}`}>
      {safeSeverity.toUpperCase()}
    </span>
  )
}

export default SeverityBadge
