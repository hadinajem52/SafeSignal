const getDefaultApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return '/api'
  }

  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  return isLocalhost ? 'http://localhost:3000/api' : `${window.location.origin}/api`
}

const DEFAULT_API_BASE_URL = getDefaultApiBaseUrl()

const normalizeApiBaseUrl = (url) => String(url || '').replace(/\/+$/, '')

export const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
)

export const SOCKET_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api$/, '')
)
