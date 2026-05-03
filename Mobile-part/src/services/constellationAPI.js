import api from './apiClient';

const NOTE_MAX_LENGTH = 280;

const normalizeNote = (note) => {
  if (note === undefined || note === null) {
    return undefined;
  }

  const trimmed = String(note).trim();
  return trimmed ? trimmed.slice(0, NOTE_MAX_LENGTH) : undefined;
};

const isOk = (status) => status === 'OK' || status === 'SUCCESS';

const getErrorMessage = (error, fallback) => {
  const statusCode = error.response?.status;
  if (statusCode === 403) {
    return 'Only nearby witnesses can respond to this prompt.';
  }
  if (statusCode === 409) {
    return 'Your response was already recorded or this prompt is no longer active.';
  }
  if (statusCode === 404) {
    return 'This witness prompt is no longer available.';
  }

  return error.response?.data?.message || fallback;
};

export const constellationAPI = {
  async submitCorroboration({
    constellationId,
    signalType,
    note,
    deviceLatitude,
    deviceLongitude,
  }) {
    try {
      const payload = {
        signalType,
      };
      const normalizedNote = normalizeNote(note);

      if (normalizedNote) {
        payload.note = normalizedNote;
      }

      if (Number.isFinite(deviceLatitude) && Number.isFinite(deviceLongitude)) {
        payload.deviceLatitude = Number(deviceLatitude.toFixed(2));
        payload.deviceLongitude = Number(deviceLongitude.toFixed(2));
      }

      const response = await api.post(`/constellations/${constellationId}/corroborate`, payload);

      if (isOk(response.data.status)) {
        return { success: true, data: response.data.data };
      }

      return { success: false, error: response.data.message || 'Failed to submit response' };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to submit response'),
        statusCode: error.response?.status,
      };
    }
  },

  async getConstellationStatus(constellationId) {
    try {
      const response = await api.get(`/constellations/${constellationId}`);

      if (isOk(response.data.status)) {
        return { success: true, data: response.data.data };
      }

      return { success: false, error: response.data.message || 'Failed to load witness prompt' };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, 'Failed to load witness prompt'),
        statusCode: error.response?.status,
      };
    }
  },
};

export { NOTE_MAX_LENGTH };
