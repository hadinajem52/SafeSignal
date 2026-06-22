import { Platform } from 'react-native';
import notifee, { AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import preferenceConstants from '../../../constants/preferences';
import { tokenStorage } from './tokenStorage';
import logger from '../utils/logger';

const DEFAULT_CHANNEL_ID = 'safesignal-default';
let notificationsInitialized = false;
const DEFAULT_STORAGE_KEY = preferenceConstants?.PREFERENCE_KEYS?.STORAGE_KEY || 'safesignal_user_preferences';

const normalizeStorageSegment = (value) => {
  return String(value || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._@-]/g, '_');
};

const getUserPreferenceStorageKey = async () => {
  try {
    const user = await tokenStorage.getUser();
    const userIdentity = user?.user_id || user?.userId || user?.email || 'guest';
    return `${DEFAULT_STORAGE_KEY}_${normalizeStorageSegment(userIdentity)}`;
  } catch {
    return `${DEFAULT_STORAGE_KEY}_guest`;
  }
};

const getPushNotificationPreference = async () => {
  try {
    const userScopedKey = await getUserPreferenceStorageKey();
    const stored = await AsyncStorage.getItem(userScopedKey);
    if (!stored) {
      return true;
    }

    const parsed = JSON.parse(stored);
    if (typeof parsed?.pushNotifications === 'boolean') {
      return parsed.pushNotifications;
    }

    return true;
  } catch (error) {
    logger.error('Failed to read notification preference:', error);
    return true;
  }
};

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') {
    return DEFAULT_CHANNEL_ID;
  }

  return notifee.createChannel({
    id: DEFAULT_CHANNEL_ID,
    name: 'SafeSignal Alerts',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
  });
};

const isAuthorized = (settings) => {
  return settings?.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
};

const statusFromAuthorization = (authorizationStatus) => {
  if (authorizationStatus >= AuthorizationStatus.AUTHORIZED) {
    return 'granted';
  }

  if (authorizationStatus === AuthorizationStatus.DENIED) {
    return 'denied';
  }

  return 'undetermined';
};

export const getMobileNotificationStatus = async () => {
  const pushEnabled = await getPushNotificationPreference();
  if (!pushEnabled) {
    notificationsInitialized = false;
    return { granted: false, status: 'disabled' };
  }

  try {
    const settings = await notifee.getNotificationSettings();
    const granted = isAuthorized(settings);
    if (!granted) {
      notificationsInitialized = false;
    }

    return {
      granted,
      status: statusFromAuthorization(settings.authorizationStatus),
    };
  } catch (error) {
    logger.error('Failed to read notification permission:', error);
    notificationsInitialized = false;
    return { granted: false, status: 'unknown' };
  }
};

export const initializeMobileNotifications = async ({ requireStoredPreference = true } = {}) => {
  if (notificationsInitialized) {
    const currentStatus = await getMobileNotificationStatus();
    if (currentStatus.granted) {
      return true;
    }
  }

  try {
    if (requireStoredPreference && !(await getPushNotificationPreference())) {
      return false;
    }

    const settings = await notifee.requestPermission();
    const hasPermission = isAuthorized(settings);

    if (!hasPermission) {
      notificationsInitialized = false;
      return false;
    }

    await ensureAndroidChannel();
    notificationsInitialized = true;
    return true;
  } catch (error) {
    logger.error('Failed to initialize notifications:', error);
    return false;
  }
};

export const displayMobileNotification = async ({
  title,
  body,
  data = {},
  android = {},
}) => {
  const pushEnabled = await getPushNotificationPreference();
  if (!pushEnabled) {
    return false;
  }

  const isReady = await initializeMobileNotifications();
  if (!isReady) {
    return false;
  }

  try {
    const channelId = await ensureAndroidChannel();
    await notifee.displayNotification({
      title: title || 'SafeSignal Update',
      body: body || '',
      data,
      android: Platform.OS === 'android'
        ? {
            channelId,
            smallIcon: 'ic_launcher',
            pressAction: { id: 'default' },
            ...android,
          }
        : undefined,
    });
    return true;
  } catch (error) {
    logger.error('Failed to display notification:', error);
    return false;
  }
};

export const sendTestNotification = async () => {
  return displayMobileNotification({
    title: 'SafeSignal Test Notification',
    body: 'Notifee is configured and working on this device.',
    data: {
      type: 'test',
      timestamp: new Date().toISOString(),
    },
  });
};
