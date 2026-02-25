import api from './apiClient';

export const timelineAPI = {
  async getTimeline(incidentId) {
    try {
      const response = await api.get(`/incidents/${incidentId}/timeline`);

      if (response.data.status === 'OK') {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch timeline';
      return { success: false, error: message };
    }
  },

  async postComment(incidentId, content, isInternal = false, attachments = null) {
    try {
      const response = await api.post(`/incidents/${incidentId}/comments`, {
        content,
        isInternal,
        attachments,
      });

      if (response.data.status === 'OK') {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to post comment';
      return { success: false, error: message };
    }
  },
};
