import api from './apiClient';

const DEFAULT_SAFETY_RADIUS_KM = 0.5;
const MAX_SAFETY_RADIUS_KM = 1;

const normalizeSafetyRadius = (radius = DEFAULT_SAFETY_RADIUS_KM) => {
  const parsedRadius = Number(radius);
  if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
    return DEFAULT_SAFETY_RADIUS_KM;
  }
  return Math.min(parsedRadius, MAX_SAFETY_RADIUS_KM);
};

export const statsAPI = {
  async getDashboardStats(params = {}) {
    try {
      const { latitude, longitude, radius = DEFAULT_SAFETY_RADIUS_KM } = params;
      const normalizedRadius = normalizeSafetyRadius(radius);
      const queryParams = new URLSearchParams();

      if (latitude !== undefined && longitude !== undefined) {
        queryParams.append('latitude', latitude.toString());
        queryParams.append('longitude', longitude.toString());
        queryParams.append('radius', normalizedRadius.toString());
      }

      const response = await api.get(`/stats/dashboard?${queryParams.toString()}`);

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch dashboard stats';
      return { success: false, error: message };
    }
  },

  async getAreaInsights({ latitude, longitude } = {}) {
    try {
      if (latitude === undefined || longitude === undefined) {
        return { success: false, error: 'Location required for area insights' };
      }

      const queryParams = new URLSearchParams();
      queryParams.append('latitude', latitude.toString());
      queryParams.append('longitude', longitude.toString());

      const response = await api.get(`/stats/area-insights?${queryParams.toString()}`);

      if (response.data.status === 'SUCCESS') {
        return { success: true, data: response.data.data };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch area insights';
      return { success: false, error: message };
    }
  },
};
