import api from './apiClient';

const isOk = (status) => status === 'OK' || status === 'SUCCESS';


const mapNotification = (n) => ({
  id: String(n.id),
  eventName: n.eventName,
  title: n.title,
  body: n.body,
  incidentId: n.incidentId ? String(n.incidentId) : null,
  data: n.data || {},
  read: Boolean(n.read),
  timestamp: n.createdAt,
});

export const notificationAPI = {
  async list({ limit, unreadOnly } = {}) {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', String(limit));
      if (unreadOnly) params.append('unreadOnly', 'true');
      const qs = params.toString();

      const response = await api.get(`/notifications${qs ? `?${qs}` : ''}`);
      if (isOk(response.data.status)) {
        const data = response.data.data || {};
        return {
          success: true,
          notifications: (data.notifications || []).map(mapNotification),
          unreadCount: data.unreadCount || 0,
        };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch notifications',
      };
    }
  },

  async getUnreadCount() {
    try {
      const response = await api.get('/notifications/unread-count');
      return isOk(response.data.status)
        ? { success: true, unreadCount: response.data.data?.unreadCount || 0 }
        : { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch unread count',
      };
    }
  },

  async markRead(id) {
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      return isOk(response.data.status) ? { success: true } : { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to mark as read' };
    }
  },

  async markAllRead() {
    try {
      const response = await api.post('/notifications/read-all');
      return isOk(response.data.status) ? { success: true } : { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to mark all as read' };
    }
  },

  async remove(id) {
    try {
      const response = await api.delete(`/notifications/${id}`);
      return isOk(response.data.status) ? { success: true } : { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to delete notification' };
    }
  },

  async clearAll() {
    try {
      const response = await api.delete('/notifications');
      return isOk(response.data.status) ? { success: true } : { success: false, error: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to clear notifications' };
    }
  },
};
