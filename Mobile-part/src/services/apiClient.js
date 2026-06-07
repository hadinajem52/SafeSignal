import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { tokenStorage } from './tokenStorage';

const DEPLOYED_API_BASE_URL = 'https://safesignal-backend-aw78.onrender.com/api';

const normalizeApiBaseUrl = (value) => {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim().replace(/\/+$/, '');
  return trimmedValue.endsWith('/api') ? trimmedValue : `${trimmedValue}/api`;
};

const getApiBaseUrl = () => {
  const configuredUrl = normalizeApiBaseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL
  );

  if (configuredUrl) {
    return configuredUrl;
  }

  if (!__DEV__) {
    return DEPLOYED_API_BASE_URL;
  }

  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://localhost:3000/api';
  }

  return 'http://localhost:3000/api';
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      await tokenStorage.clearAll();
    }

    return Promise.reject(error);
  }
);

export default api;
