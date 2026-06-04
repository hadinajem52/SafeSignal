import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import api from './apiClient';
import { initializeMobileNotifications } from './mobileNotifications';

const isAndroid = Platform.OS === 'android';

const extractToken = (tokenResult) => {
  if (typeof tokenResult === 'string') {
    return tokenResult;
  }
  return tokenResult?.data || null;
};

export const pushTokenService = {
  async registerDevicePushToken({ locationConsent }) {
    if (!locationConsent || !isAndroid) {
      return { success: false, skipped: true };
    }

    try {
      const hasPermission = await initializeMobileNotifications({ requireStoredPreference: false });
      if (!hasPermission) {
        await this.clearDevicePushToken();
        return { success: false, skipped: true };
      }

      const tokenResult = await Notifications.getDevicePushTokenAsync();
      const token = extractToken(tokenResult);
      if (!token) {
        return { success: false, skipped: true };
      }

      await api.patch('/users/me/push-token', { token });
      return { success: true, tokenType: tokenResult?.type || 'unknown' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to register push token',
      };
    }
  },

  async updateDevicePushToken(tokenResult, { locationConsent }) {
    if (!locationConsent || !isAndroid) {
      return { success: false, skipped: true };
    }

    const token = extractToken(tokenResult);
    if (!token) {
      return { success: false, skipped: true };
    }

    try {
      await api.patch('/users/me/push-token', { token });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to update push token',
      };
    }
  },

  async clearDevicePushToken() {
    try {
      await api.delete('/users/me/push-token');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to clear push token',
      };
    }
  },

  async sendFcmTestNotification() {
    try {
      const response = await api.post('/users/me/push-token/test-fcm');
      return {
        success: true,
        message: response.data?.message || 'FCM test notification sent',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to send FCM test notification',
      };
    }
  },
};
