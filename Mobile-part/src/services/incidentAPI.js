import api from './apiClient';
import { createUploadFile } from '../utils/mediaUtils';
import limits from '../../../constants/limits';

const { LIMITS } = limits;

const appendValue = (formData, key, value) => {
  if (value === undefined || value === null) return;
  formData.append(key, String(value));
};

const buildIncidentFormData = (incidentData) => {
  const formData = new FormData();
  const { photos = [], video, photoUrls, ...fields } = incidentData;

  Object.entries(fields).forEach(([key, value]) => {
    appendValue(formData, key, value);
  });

  const reportPhotos = photos.length ? photos : photoUrls || [];
  reportPhotos.forEach((photo, index) => {
    const file = createUploadFile(photo, `incident-photo-${index + 1}.jpg`, 'image/jpeg');
    if (file) formData.append('photos', file);
  });

  const videoFile = createUploadFile(video, 'incident-video.mp4', 'video/mp4');
  if (videoFile) {
    formData.append('video', videoFile);
    appendValue(formData, 'videoDurationMs', video?.duration);
  }

  return formData;
};

const multipartConfig = {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
};

const getMediaSize = (media) => Number(media?.fileSize || media?.size || 0);

const getIncidentMediaSummary = (incidentData) => {
  const photos = incidentData.photos || incidentData.photoUrls || [];
  return {
    photoCount: Array.isArray(photos) ? photos.length : 0,
    photoBytes: Array.isArray(photos)
      ? photos.reduce((sum, photo) => sum + getMediaSize(photo), 0)
      : 0,
    hasVideo: Boolean(incidentData.video),
    videoBytes: getMediaSize(incidentData.video),
    videoDurationMs: Number(incidentData.video?.duration || 0),
    isDraft: Boolean(incidentData.isDraft),
  };
};

const formatMegabytes = (bytes) => `${Math.ceil(bytes / (1024 * 1024))} MB`;

const getKnownUploadBytes = (summary) => summary.photoBytes + summary.videoBytes;

const validateKnownUploadSize = (summary) => {
  if (summary.videoBytes > LIMITS.MAX_VIDEO_BYTES) {
    return `Video must be ${formatMegabytes(LIMITS.MAX_VIDEO_BYTES)} or smaller.`;
  }

  if (summary.photoBytes > LIMITS.MAX_UPLOAD_BYTES) {
    return `Photos exceed the ${formatMegabytes(LIMITS.MAX_UPLOAD_BYTES)} upload limit.`;
  }

  const knownBytes = getKnownUploadBytes(summary);
  if (knownBytes > LIMITS.MAX_UPLOAD_BYTES) {
    return `Total upload must be ${formatMegabytes(LIMITS.MAX_UPLOAD_BYTES)} or smaller.`;
  }

  return null;
};

export const incidentAPI = {
  async submitIncident(incidentData) {
    try {
      const { idempotencyKey: providedIdempotencyKey, ...payload } = incidentData;
      const idempotencyKey =
        providedIdempotencyKey ||
        `incident_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      const mediaSummary = getIncidentMediaSummary(payload);
      const mediaSizeError = validateKnownUploadSize(mediaSummary);

      console.log('Submitting incident media:', mediaSummary);

      if (mediaSizeError) {
        return { success: false, error: mediaSizeError };
      }

      const response = await api.post('/incidents/submit', buildIncidentFormData(payload), {
        headers: {
          ...multipartConfig.headers,
          'Idempotency-Key': idempotencyKey,
        },
      });

      if (response.data.status === 'SUCCESS' || response.data.status === 'OK') {
        return {
          success: true,
          incident: response.data.data?.incident || response.data.data,
          message: response.data.message,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      console.log('Submit incident failed:', {
        message: error.message,
        status: error.response?.status,
        responseMessage: error.response?.data?.message,
        responseCode: error.response?.data?.code,
        validationErrors: error.response?.data?.errors,
        media: getIncidentMediaSummary(incidentData),
      });
      const message = error.response?.data?.message || 'Failed to submit incident';
      const errors = error.response?.data?.errors;
      return {
        success: false,
        error: message,
        validationErrors: errors,
        networkError: !error.response,
        status: error.response?.status,
      };
    }
  },

  async updateIncident(incidentId, incidentData) {
    try {
      const mediaSummary = getIncidentMediaSummary(incidentData);
      const mediaSizeError = validateKnownUploadSize(mediaSummary);

      console.log('Updating incident media:', {
        incidentId,
        ...mediaSummary,
      });

      if (mediaSizeError) {
        return { success: false, error: mediaSizeError };
      }

      const response = await api.put(
        `/incidents/${incidentId}`,
        buildIncidentFormData(incidentData),
        multipartConfig,
      );

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          incident: response.data.data.incident,
          message: response.data.message,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      console.log('Update incident failed:', {
        incidentId,
        message: error.message,
        status: error.response?.status,
        responseMessage: error.response?.data?.message,
        responseCode: error.response?.data?.code,
        validationErrors: error.response?.data?.errors,
        media: getIncidentMediaSummary(incidentData),
      });
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
            videoUrl: incident.video_url || incident.videoUrl || null,
            duplicateOfIncidentId: incident.duplicate_of_incident_id || incident.duplicateOfIncidentId || null,
            duplicateOfTitle: incident.duplicate_of_title || incident.duplicateOfTitle || null,
            duplicateOfStatus: incident.duplicate_of_status || incident.duplicateOfStatus || null,
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

  async getIncidentById(incidentId) {
    try {
      const response = await api.get(`/incidents/${incidentId}`);

      if (response.data.status === 'SUCCESS' || response.data.status === 'OK') {
        return {
          success: true,
          incident: response.data.data.incident || response.data.data,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch incident';
      return { success: false, error: message };
    }
  },

  async getMapIncidents(params = {}) {
    try {
      const {
        ne_lat,
        ne_lng,
        sw_lat,
        sw_lng,
        category,
        timeframe = '30d',
        includeConstellation = false,
      } = params;
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

      if (includeConstellation) {
        queryParams.append('include_constellation', 'true');
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

  async previewClassification({ title, description }) {
    try {
      const response = await api.post('/incidents/classify-preview', { title, description });
      if (response.data.status === 'SUCCESS') {
        return { success: true, ...response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to preview AI tags',
      };
    }
  },

  async getCorroboration(incidentId) {
    try {
      const response = await api.get(`/incidents/${incidentId}/corroboration`);
      if (response.data.status === 'SUCCESS') {
        return { success: true, ...response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to load corroboration' };
    }
  },

  async setCorroboration(incidentId, corroborate) {
    try {
      const response = corroborate
        ? await api.post(`/incidents/${incidentId}/corroborate`)
        : await api.delete(`/incidents/${incidentId}/corroborate`);
      if (response.data.status === 'SUCCESS') {
        return { success: true, ...response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to update corroboration' };
    }
  },

  async getFollowState(incidentId) {
    try {
      const response = await api.get(`/incidents/${incidentId}/follow`);
      if (response.data.status === 'SUCCESS') {
        return { success: true, ...response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to load follow state' };
    }
  },

  async setFollow(incidentId, follow) {
    try {
      const response = follow
        ? await api.post(`/incidents/${incidentId}/follow`)
        : await api.delete(`/incidents/${incidentId}/follow`);
      if (response.data.status === 'SUCCESS') {
        return { success: true, ...response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to update follow' };
    }
  },
};
