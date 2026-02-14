import { STATUS_COLORS, STATUS_LABELS } from '../constants/incident'

export const SEVERITY_VARIANTS = {
  REPORTS: 'reports',
  LAW_ENFORCEMENT: 'law_enforcement',
}

export const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.default

export const formatStatusLabel = (status) => {
  if (!status || typeof status !== 'string') {
    return 'N/A'
  }

  if (STATUS_LABELS[status]) {
    return STATUS_LABELS[status]
  }

  return status.replace(/_/g, ' ').toUpperCase()
}

export const getSeverityColor = (severity, variant = SEVERITY_VARIANTS.REPORTS) => {
  if (variant === SEVERITY_VARIANTS.LAW_ENFORCEMENT) {
    switch (severity) {
      case 'critical':
        return 'text-red-600'
      case 'high':
        return 'text-orange-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  switch (severity) {
    case 'low':
      return 'text-green-600'
    case 'medium':
      return 'text-yellow-600'
    case 'high':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

export const openMapsUrl = (latitude, longitude) =>
  Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : '#'
