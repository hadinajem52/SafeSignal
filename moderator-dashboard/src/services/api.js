import axios from 'axios'
import { API_BASE_URL } from '../utils/network'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('moderator_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401 || status === 403) {
      localStorage.removeItem('moderator_user')
      localStorage.removeItem('moderator_token')

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: async ({ username, email, password, role = 'citizen' }) => {
    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
        role,
      })
      return { success: true, data: response.data.data, message: response.data.message }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit application',
      }
    }
  },
}

// Reports API
export const reportsAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/incidents', { params })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch reports' }
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/incidents/${id}`)
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch report' }
    }
  },

  getDedup: async (id) => {
    try {
      const response = await api.get(`/incidents/${id}/dedup`)
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch dedup candidates' }
    }
  },

  getMlSummary: async (id) => {
    try {
      const response = await api.get(`/incidents/${id}/ml`)
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch ML summary' }
    }
  },

  updateCategory: async (id, category) => {
    try {
      const response = await api.patch(`/incidents/${id}/category`, { category })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to update category' }
    }
  },

  linkDuplicate: async (id, duplicateIncidentId) => {
    try {
      const response = await api.post(`/incidents/${id}/duplicates`, { duplicateIncidentId })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to link duplicate' }
    }
  },

  updateStatus: async (id, status) => {
    try {
      const response = await api.patch(`/incidents/${id}`, { status })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to update report' }
    }
  },

  verify: async (id) => {
    try {
      const response = await api.post(`/incidents/${id}/verify`)
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to verify report' }
    }
  },

  reject: async (id, reason) => {
    try {
      const response = await api.post(`/incidents/${id}/reject`, { reason })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to reject report' }
    }
  },
}

// Users API
export const usersAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/users', { params })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch users' }
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/users/${id}`)
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch user' }
    }
  },

  suspend: async (id) => {
    try {
      const response = await api.patch(`/users/${id}`, { is_suspended: true })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to suspend user' }
    }
  },

  unsuspend: async (id) => {
    try {
      const response = await api.patch(`/users/${id}`, { is_suspended: false })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to unsuspend user' }
    }
  },

  updateRole: async (id, role) => {
    try {
      const response = await api.patch(`/users/${id}`, { role })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to update user role' }
    }
  },
}

// Stats API
export const statsAPI = {
  getDashboardStats: async () => {
    try {
      const response = await api.get('/stats/moderator/dashboard')
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch stats' }
    }
  },
}

// Settings API
export const settingsAPI = {
  get: async () => {
    try {
      const response = await api.get('/settings')
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch settings' }
    }
  },

  update: async (settings) => {
    try {
      const response = await api.put('/settings', settings)
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to save settings' }
    }
  },

  reset: async () => {
    try {
      const response = await api.post('/settings/reset')
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to reset settings' }
    }
  },

  sendWeeklyDigestNow: async () => {
    try {
      const response = await api.post('/settings/weekly-digest/send')
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to send weekly digest' }
    }
  },
}

// Law Enforcement Interface API
export const leiAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/incidents/lei', { params })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch LEI incidents' }
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/incidents/lei/${id}`)
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch LEI incident' }
    }
  },

  updateStatus: async (id, payload) => {
    try {
      const response = await api.patch(`/incidents/lei/${id}/status`, payload)
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to update LEI status' }
    }
  },
}

// Admin API
export const adminAPI = {
  getPendingApplications: async () => {
    try {
      const response = await api.get('/admin/applications/pending')
      return { success: true, data: response.data.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch pending applications',
      }
    }
  },

  approveApplication: async (id) => {
    try {
      const response = await api.post(`/admin/applications/${id}/approve`)
      return { success: true, data: response.data.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to approve application',
      }
    }
  },

  rejectApplication: async (id) => {
    try {
      const response = await api.delete(`/admin/applications/${id}/reject`)
      return { success: true, data: response.data.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reject application',
      }
    }
  },

  getDatabaseTables: async () => {
    try {
      const response = await api.get('/admin/database/tables')
      return { success: true, data: response.data.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch database tables',
      }
    }
  },

  getTableRows: async (tableName, limit = 50) => {
    try {
      const response = await api.get(`/admin/database/tables/${encodeURIComponent(tableName)}/rows`, {
        params: { limit },
      })
      return { success: true, data: response.data.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch table rows',
      }
    }
  },

  deleteTableRow: async (tableName, rowId) => {
    try {
      const response = await api.delete(
        `/admin/database/tables/${encodeURIComponent(tableName)}/rows/${rowId}`
      )
      return { success: true, data: response.data.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete row',
      }
    }
  },

  clearTable: async (tableName) => {
    try {
      const response = await api.delete(`/admin/database/tables/${encodeURIComponent(tableName)}`)
      return { success: true, data: response.data.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to clear table',
      }
    }
  },

  clearAllData: async () => {
    try {
      const response = await api.delete('/admin/database/all')
      return { success: true, data: response.data.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to clear all data',
      }
    }
  },

  resetAllReports: async () => {
    try {
      const response = await api.post('/admin/reports/reset')
      return { success: true, data: response.data.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to reset reports',
      }
    }
  },
}

// Timeline/Comments API
export const timelineAPI = {
  getTimeline: async (incidentId) => {
    try {
      const response = await api.get(`/incidents/${incidentId}/timeline`)
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch timeline' }
    }
  },

  postComment: async (incidentId, content, isInternal = false, attachments = null) => {
    try {
      const response = await api.post(`/incidents/${incidentId}/comments`, {
        content,
        isInternal,
        attachments,
      })
      return { success: true, data: response.data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to post comment' }
    }
  },
}

export default api

