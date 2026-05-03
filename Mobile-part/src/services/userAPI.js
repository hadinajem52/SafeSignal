import api from './apiClient';

const isOk = (status) => status === 'OK' || status === 'SUCCESS';

export const userAPI = {
  async setLocationConsent(consent) {
    try {
      const response = await api.patch('/users/me/location-consent', { consent });
      return isOk(response.data.status)
        ? { success: true }
        : { success: false, error: response.data.message || 'Failed to update location consent' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update location consent',
      };
    }
  },

  async updateLocation({ latitude, longitude }) {
    try {
      const response = await api.patch('/users/me/location', {
        latitude: Number(latitude.toFixed(2)),
        longitude: Number(longitude.toFixed(2)),
      });
      return isOk(response.data.status)
        ? { success: true }
        : { success: false, error: response.data.message || 'Failed to update location' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update location',
      };
    }
  },
};
