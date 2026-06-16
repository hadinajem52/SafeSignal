import api from './apiClient';

export const savedAreaAPI = {
  async list() {
    try {
      const response = await api.get('/saved-areas');
      if (response.data.status === 'SUCCESS') {
        return { success: true, areas: response.data.data || [] };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to load saved areas' };
    }
  },

  async create({ label, latitude, longitude, radiusKm }) {
    try {
      const response = await api.post('/saved-areas', { label, latitude, longitude, radiusKm });
      if (response.data.status === 'SUCCESS') {
        return { success: true, area: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to save area' };
    }
  },

  async remove(areaId) {
    try {
      const response = await api.delete(`/saved-areas/${areaId}`);
      if (response.data.status === 'SUCCESS') {
        return { success: true };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to delete area' };
    }
  },
};
