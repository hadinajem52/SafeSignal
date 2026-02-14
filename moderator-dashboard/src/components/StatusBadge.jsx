import React from 'react'
import { formatStatusLabel, getStatusColor } from '../utils/incident'

const SIZE_CLASSES = {
  xs: 'px-3 py-1 text-xs',
  sm: 'px-4 py-2 text-sm',
}

function StatusBadge({ status, label, className, size = 'xs' }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.xs
  const colorClass = className || getStatusColor(status)
  const displayLabel = label || formatStatusLabel(status)

  return (
    <span className={`${sizeClass} rounded-full font-medium ${colorClass}`}>
      {displayLabel}
    </span>
  )
}

export default StatusBadge
