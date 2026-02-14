import React from 'react'
import { formatStatusLabel, getStatusColor, getStatusHexColor } from '../utils/incident'

const SIZE_CLASSES = {
  xs: 'px-3 py-1 text-xs',
  sm: 'px-4 py-2 text-sm',
}

function StatusBadge({ status, label, className, size = 'xs', colorMode = 'tailwind' }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.xs
  const displayLabel = label || formatStatusLabel(status)

  if (colorMode === 'hex') {
    const hexColor = getStatusHexColor(status)

    return (
      <span className={`${sizeClass} rounded-full font-medium text-white`} style={{ backgroundColor: hexColor }}>
        {displayLabel}
      </span>
    )
  }

  const colorClass = className || getStatusColor(status)

  return (
    <span className={`${sizeClass} rounded-full font-medium ${colorClass}`}>
      {displayLabel}
    </span>
  )
}

export default StatusBadge
