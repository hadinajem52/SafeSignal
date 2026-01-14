import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// API base URL - change this to your backend URL
// For physical device, use your computer's IP address on the same network
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.9:3000/api'  // Your computer's WiFi IP
  : 'https://your-production-api.com/api';

// For Android emulator: http://10.0.2.2:3000/api
// For iOS simulator: http://localhost:3000/api
// For physical device: http://YOUR_COMPUTER_IP:3000/api

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
   * Register a new user (sends verification code)
   */
  async register(username, email, password) {
    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
      });

      if (response.data.status === 'OK') {
        // Registration now requires verification
        const { requiresVerification, email: userEmail } = response.data.data;
        return { 
          success: true, 
          requiresVerification: requiresVerification || false,
          email: userEmail,
          message: response.data.message,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      const errors = error.response?.data?.errors;
      return { success: false, error: message, validationErrors: errors };
    }
  },

  /**
   * Verify email with code
   */
  async verifyEmail(email, code) {
    try {
      const response = await api.post('/auth/verify', { email, code });

      if (response.data.status === 'OK') {
        const { token, user } = response.data.data;
        await tokenStorage.setToken(token);
        await tokenStorage.setUser(user);
        return { success: true, user, token };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      return { success: false, error: message };
    }
  },

  /**
   * Resend verification code
   */
  async resendVerificationCode(email) {
    try {
      const response = await api.post('/auth/resend-code', { email });

      if (response.data.status === 'OK') {
        return { success: true, message: response.data.message };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend code';
      return { success: false, error: message };
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
      const requiresVerification = error.response?.data?.requiresVerification;
      const userEmail = error.response?.data?.email;
      return { success: false, error: message, requiresVerification, email: userEmail };
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

  /**
   * Sign in with Google
   */
  async googleSignIn(idToken) {
    try {
      const response = await api.post('/auth/google', { idToken });

      if (response.data.status === 'OK') {
        const { token, user } = response.data.data;
        await tokenStorage.setToken(token);
        await tokenStorage.setUser(user);
        return { success: true, user, token };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Google sign-in failed';
      return { success: false, error: message };
    }
  },
};

export default api;
