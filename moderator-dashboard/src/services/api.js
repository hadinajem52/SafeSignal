import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

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

export default api
