import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import api from './apiClient';

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
      const permission = await Notifications.requestPermissionsAsync();
      const status = permission.status || permission.granted;
      if (status !== 'granted' && permission.granted !== true) {
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
};
