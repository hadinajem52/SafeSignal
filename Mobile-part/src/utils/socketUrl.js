import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEPLOYED_SOCKET_URL = 'https://safesignal-backend-aw78.onrender.com';

const normalizeUrl = (value) => {
  if (!value) {
    return null;
  }

  return value.trim().replace(/\/+$/, '');
};

const getConfiguredSocketUrl = () => {
  const socketUrl = normalizeUrl(process.env.EXPO_PUBLIC_SOCKET_URL);

  if (socketUrl) {
    return socketUrl;
  }

  const apiBaseUrl = normalizeUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL
  );

  return apiBaseUrl?.replace(/\/api$/, '') || null;
};

const getSocketUrl = () => {
  const configuredUrl = getConfiguredSocketUrl();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (!__DEV__) {
    return DEPLOYED_SOCKET_URL;
  }

  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000`;
  }

  if (Platform.OS === 'android') {
    return 'http://localhost:3000';
  }

  return 'http://localhost:3000';
};

export default getSocketUrl;
