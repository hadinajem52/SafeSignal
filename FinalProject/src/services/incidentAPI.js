import api from './apiClient';

export const incidentAPI = {
  async submitIncident(incidentData) {
    try {
      const idempotencyKey =
        incidentData.idempotencyKey ||
        `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await api.post('/incidents/submit', incidentData, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          incident: response.data.data.incident,
          message: response.data.message,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit incident';
      const errors = error.response?.data?.errors;
      return { success: false, error: message, validationErrors: errors };
    }
  },

  async updateIncident(incidentId, incidentData) {
    try {
      const response = await api.put(`/incidents/${incidentId}`, incidentData);

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          incident: response.data.data.incident,
          message: response.data.message,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update incident';
      const errors = error.response?.data?.errors;
      return { success: false, error: message, validationErrors: errors };
    }
  },

  async deleteIncident(incidentId) {
    try {
      const response = await api.delete(`/incidents/${incidentId}`);

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          message: response.data.message,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete incident';
      return { success: false, error: message };
    }
  },

  async getMyIncidents(params = {}) {
    try {
      const { status, isDraft, limit = 50, offset = 0 } = params;
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) {
        queryParams.append('status', status);
      }

      if (isDraft !== undefined) {
        queryParams.append('isDraft', isDraft.toString());
      }

      const response = await api.get(`/incidents/list?${queryParams.toString()}`);

      if (response.data.status === 'SUCCESS') {
        const normalizedIncidents = (response.data.data.incidents || []).map((incident) => {
          const latitude =
            incident.latitude !== undefined && incident.latitude !== null
              ? Number(incident.latitude)
              : null;
          const longitude =
            incident.longitude !== undefined && incident.longitude !== null
              ? Number(incident.longitude)
              : null;
          const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

          return {
            ...incident,
            id: incident.incident_id || incident.id,
            createdAt: incident.created_at || incident.createdAt,
            locationName: incident.location_name || incident.locationName || '',
            location: hasCoordinates ? { latitude, longitude } : null,
          };
        });

        return {
          success: true,
          incidents: normalizedIncidents,
          pagination: response.data.data.pagination,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch incidents';
      return { success: false, error: message };
    }
  },

  async getDrafts() {
    try {
      const response = await api.get('/incidents/list?isDraft=true');

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          drafts: response.data.data.incidents,
          pagination: response.data.data.pagination,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch drafts';
      return { success: false, error: message };
    }
  },

  async getIncidentById(incidentId) {
    try {
      const response = await api.get(`/incidents/${incidentId}`);

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          incident: response.data.data.incident,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch incident';
      return { success: false, error: message };
    }
  },

  async updateIncidentStatus(incidentId, status, notes = '') {
    try {
      const response = await api.put(`/incidents/${incidentId}/status`, {
        status,
        notes,
      });

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          incident: response.data.data.incident,
          message: response.data.message,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update incident status';
      return { success: false, error: message };
    }
  },

  async getMapIncidents(params = {}) {
    try {
      const { ne_lat, ne_lng, sw_lat, sw_lng, category, timeframe = '30d' } = params;
      const queryParams = new URLSearchParams({ timeframe });

      if (ne_lat && ne_lng && sw_lat && sw_lng) {
        queryParams.append('ne_lat', ne_lat.toString());
        queryParams.append('ne_lng', ne_lng.toString());
        queryParams.append('sw_lat', sw_lat.toString());
        queryParams.append('sw_lng', sw_lng.toString());
      }

      if (category) {
        queryParams.append('category', category);
      }

      const response = await api.get(`/map/incidents?${queryParams.toString()}`);

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          incidents: response.data.data.incidents,
          count: response.data.data.count,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch map incidents';
      return { success: false, error: message };
    }
  },
};
