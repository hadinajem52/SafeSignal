import React from 'react'
import { formatStatusLabel, getStatusColor, getStatusHexColor } from '../utils/incident'
import { BADGE_LIGHT_STYLES } from '../constants/incident'

const SIZE_CLASSES = {
  xs: 'px-2.5 py-0.5 text-[11px]',
  sm: 'px-3 py-1.5 text-xs',
}

/**
 * StatusBadge — renders with CSS-variable badge tokens so it works in both
 * light and dark mode without jarring bright blobs.
 */
function StatusBadge({ status, label, className, size = 'xs', colorMode = 'tailwind' }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.xs
  const displayLabel = label || formatStatusLabel(status)

  if (colorMode === 'hex') {
    const hexColor = getStatusHexColor(status)
    return (
      <span className={`${sizeClass} rounded-full font-semibold text-white`} style={{ backgroundColor: hexColor }}>
        {displayLabel}
      </span>
    )
  }

  // Token-based approach: STATUS_COLORS now returns a badge token name like "badge-yellow"
  const tokenName = getStatusColor(status)
  const light = BADGE_LIGHT_STYLES[tokenName] || BADGE_LIGHT_STYLES['badge-gray']

  // Use CSS variables with light-mode fallback
  const badgeStyle = {
    backgroundColor: `var(--color-${tokenName}-bg, ${light.bg})`,
    color: `var(--color-${tokenName}-text, ${light.text})`,
    borderColor: `var(--color-${tokenName}-border, ${light.border})`,
  }

  return (
    <span
      className={`${sizeClass} rounded-full font-semibold border ${className || ''}`.trim()}
      style={badgeStyle}
    >
      {displayLabel}
    </span>
  )
}

export default StatusBadge
