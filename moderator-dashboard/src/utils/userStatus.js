import { formatStatusLabel, getStatusColor } from './incident'

export const getUserStatusColor = (status, isSuspended) => {
  if (isSuspended) {
    return 'bg-red-100 text-red-800'
  }

  return status === 'active' ? 'bg-green-100 text-green-800' : getStatusColor(status)
}

export const getUserStatusLabel = (status, isSuspended) =>
  isSuspended ? 'SUSPENDED' : formatStatusLabel(status)
