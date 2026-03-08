import api from './apiClient';
import { normalizeClosureDetails } from '../utils/incidentUtils';

export const feedAPI = {
  async getPublicFeed(params = {}) {
    try {
      const {
        category,
        closure_outcome,
        severity,
        lat,
        lng,
        radius,
        sort,
        limit = 20,
        offset = 0,
      } = params;

      const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });

      if (category) query.append('category', category);
      if (closure_outcome) query.append('closure_outcome', closure_outcome);
      if (severity) query.append('severity', severity);
      if (lat !== undefined && lat !== null) query.append('lat', String(lat));
      if (lng !== undefined && lng !== null) query.append('lng', String(lng));
      if (radius !== undefined && radius !== null) query.append('radius', String(radius));
      if (sort) query.append('sort', sort);

      const response = await api.get(`/incidents/feed?${query.toString()}`);

      if (response.data.status === 'OK' || response.data.status === 'SUCCESS') {
        return {
          success: true,
          incidents: response.data.data.map(normalizeIncident),
          total: response.data.total,
        };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load feed',
      };
    }
  },
};

function normalizeIncident(i) {
  const lat = Number(i.latitude);
  const lng = Number(i.longitude);
  return {
    ...i,
    id: i.incident_id,
    incident_id: i.incident_id,
    location:
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { latitude: lat, longitude: lng }
        : null,
    description: i.description || '',
    locationName: i.location_name || '',
    location_name: i.location_name || '',
    createdAt: i.created_at || i.incident_date,
    created_at: i.created_at || i.incident_date,
    closedAt: i.closed_at,
    closureOutcome: i.closure_outcome,
    closure_outcome: i.closure_outcome,
    closureDetails: normalizeClosureDetails(i.closure_details),
    closure_details: normalizeClosureDetails(i.closure_details),
  };
}

