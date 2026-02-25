import api from './apiClient';

const DEFAULT_SAFETY_RADIUS_KM = 1;
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

  async getAreaSafety(latitude, longitude, radius = DEFAULT_SAFETY_RADIUS_KM) {
    try {
      const normalizedRadius = normalizeSafetyRadius(radius);
      const queryParams = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: normalizedRadius.toString(),
      });

      const response = await api.get(`/stats/area-safety?${queryParams.toString()}`);

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch area safety';
      return { success: false, error: message };
    }
  },

  async getCommunityStats() {
    try {
      const response = await api.get('/stats/community');

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch community stats';
      return { success: false, error: message };
    }
  },
};
