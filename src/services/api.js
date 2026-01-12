import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// API base URL - change this to your backend URL
const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:3000/api'  // Android emulator localhost
  : 'https://your-production-api.com/api';

// For iOS simulator, use: http://localhost:3000/api
// For physical device, use your computer's IP address

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const TOKEN_KEY = 'safesignal_auth_token';
const USER_KEY = 'safesignal_user_data';

/**
 * Secure Token Storage using expo-secure-store
 * Uses keychain on iOS, encrypted SharedPreferences on Android
 */
export const tokenStorage = {
  /**
   * Store auth token securely
   */
  async setToken(token) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return true;
    } catch (error) {
      console.error('Error storing token:', error);
      return false;
    }
  },

  /**
   * Retrieve auth token
   */
  async getToken() {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  },

  /**
   * Remove auth token
   */
  async removeToken() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      return true;
    } catch (error) {
      console.error('Error removing token:', error);
      return false;
    }
  },

  /**
   * Store user data securely
   */
  async setUser(user) {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Error storing user data:', error);
      return false;
    }
  },

  /**
   * Retrieve user data
   */
  async getUser() {
    try {
      const data = await SecureStore.getItemAsync(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  },

  /**
   * Remove user data
   */
  async removeUser() {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
      return true;
    } catch (error) {
      console.error('Error removing user data:', error);
      return false;
    }
  },

  /**
   * Clear all auth data
   */
  async clearAll() {
    await this.removeToken();
    await this.removeUser();
  },
};

// Request interceptor - add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired, clear storage and redirect to login
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      await tokenStorage.clearAll();
      // You can emit an event here to trigger navigation to login
    }

    return Promise.reject(error);
  }
);

/**
 * Auth API functions
 */
export const authAPI = {
  /**
   * Register a new user
   */
  async register(username, email, password) {
    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
      });

      if (response.data.status === 'OK') {
        const { token, user } = response.data.data;
        await tokenStorage.setToken(token);
        await tokenStorage.setUser(user);
        return { success: true, user, token };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      const errors = error.response?.data?.errors;
      return { success: false, error: message, validationErrors: errors };
    }
  },

  /**
   * Login user
   */
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      if (response.data.status === 'OK') {
        const { token, user } = response.data.data;
        await tokenStorage.setToken(token);
        await tokenStorage.setUser(user);
        return { success: true, user, token };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, error: message };
    }
  },

  /**
   * Logout user
   */
  async logout() {
    await tokenStorage.clearAll();
    return { success: true };
  },

  /**
   * Get current user profile
   */
  async getProfile() {
    try {
      const response = await api.get('/auth/me');
      if (response.data.status === 'OK') {
        return { success: true, user: response.data.data.user };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to get profile';
      return { success: false, error: message };
    }
  },

  /**
   * Refresh auth token
   */
  async refreshToken() {
    try {
      const response = await api.post('/auth/refresh');
      if (response.data.status === 'OK') {
        const { token } = response.data.data;
        await tokenStorage.setToken(token);
        return { success: true, token };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to refresh token';
      return { success: false, error: message };
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const token = await tokenStorage.getToken();
    return !!token;
  },

  /**
   * Get stored user data
   */
  async getStoredUser() {
    return await tokenStorage.getUser();
  },
};

export default api;
