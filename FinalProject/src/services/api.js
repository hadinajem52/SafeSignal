import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// API base URL - automatically handles different environments
// For Android physical device with ADB reverse: adb reverse tcp:3000 tcp:3000
// For Android emulator: uses 10.0.2.2
// For iOS simulator: uses localhost
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return 'https://your-production-api.com/api';
  }
  
  // Try to get the debugger host from Expo (works when using Expo Go or dev client)
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000/api`;
  }
  
  // Fallback based on platform
  if (Platform.OS === 'android') {
    // Use localhost with ADB reverse (run: adb reverse tcp:3000 tcp:3000)
    // Or use 10.0.2.2 for emulator
    return 'http://localhost:3000/api';
  }
  
  // iOS simulator
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

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
  async googleSignIn(idToken, email, name) {
    try {
      const response = await api.post('/auth/google', { 
        idToken,
        email,
        name
      });

      if (response.data.status === 'OK') {
        const { token, user } = response.data.data;
        await tokenStorage.setToken(token);
        await tokenStorage.setUser(user);
        return { success: true, user, token };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      console.error('Google sign-in API error:', error.response?.data || error.message);
      const message = error.response?.data?.message || 'Google sign-in failed';
      return { success: false, error: message };
    }
  },
};

/**
 * Incident API functions
 */
export const incidentAPI = {
  /**
   * Submit a new incident report
   */
  async submitIncident(incidentData) {
    try {
      // Generate a unique idempotency key to prevent duplicate submissions
      // This ensures if the request is retried, the server won't create duplicate reports
      const idempotencyKey = incidentData.idempotencyKey || `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await api.post('/incidents/submit', incidentData, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      if (response.data.status === 'SUCCESS') {
        return { 
          success: true, 
          incident: response.data.data.incident,
          message: response.data.message 
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit incident';
      const errors = error.response?.data?.errors;
      return { success: false, error: message, validationErrors: errors };
    }
  },

  /**
   * Update an existing incident (primarily for drafts)
   */
  async updateIncident(incidentId, incidentData) {
    try {
      const response = await api.put(`/incidents/${incidentId}`, incidentData);

      if (response.data.status === 'SUCCESS') {
        return { 
          success: true, 
          incident: response.data.data.incident,
          message: response.data.message 
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update incident';
      const errors = error.response?.data?.errors;
      return { success: false, error: message, validationErrors: errors };
    }
  },

  /**
   * Delete an incident (only drafts)
   */
  async deleteIncident(incidentId) {
    try {
      const response = await api.delete(`/incidents/${incidentId}`);

      if (response.data.status === 'SUCCESS') {
        return { 
          success: true, 
          message: response.data.message 
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete incident';
      return { success: false, error: message };
    }
  },

  /**
   * Get list of user's incidents
   */
  async getMyIncidents(params = {}) {
    try {
      const { status, isDraft, limit = 50, offset = 0 } = params;
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) {
        queryParams.append('status', status);
      }

      if (isDraft !== undefined) {
        queryParams.append('isDraft', isDraft.toString());
      }

      const response = await api.get(`/incidents/list?${queryParams.toString()}`);

      if (response.data.status === 'SUCCESS') {
        // Normalize incidents: convert incident_id to id for consistency
        const normalizedIncidents = (response.data.data.incidents || []).map(incident => {
          const latitude = incident.latitude !== undefined && incident.latitude !== null
            ? Number(incident.latitude)
            : null;
          const longitude = incident.longitude !== undefined && incident.longitude !== null
            ? Number(incident.longitude)
            : null;
          const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

          return {
            ...incident,
            id: incident.incident_id || incident.id,
            createdAt: incident.created_at || incident.createdAt,
            locationName: incident.location_name || incident.locationName || '',
            location: hasCoordinates ? { latitude, longitude } : null,
          };
        });

        return {
          success: true,
          incidents: normalizedIncidents,
          pagination: response.data.data.pagination,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch incidents';
      return { success: false, error: message };
    }
  },

  /**
   * Get user's draft incidents
   */
  async getDrafts() {
    try {
      const response = await api.get('/incidents/list?isDraft=true');

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          drafts: response.data.data.incidents,
          pagination: response.data.data.pagination,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch drafts';
      return { success: false, error: message };
    }
  },

  /**
   * Get a specific incident by ID
   */
  async getIncidentById(incidentId) {
    try {
      const response = await api.get(`/incidents/${incidentId}`);

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          incident: response.data.data.incident,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch incident';
      return { success: false, error: message };
    }
  },

  /**
   * Update incident status (moderators only)
   */
  async updateIncidentStatus(incidentId, status, notes = '') {
    try {
      const response = await api.put(`/incidents/${incidentId}/status`, {
        status,
        notes,
      });

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          incident: response.data.data.incident,
          message: response.data.message,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update incident status';
      return { success: false, error: message };
    }
  },

  /**
   * Get incidents for map display (public)
   */
  async getMapIncidents(params = {}) {
    try {
      const { ne_lat, ne_lng, sw_lat, sw_lng, category, timeframe = '30d' } = params;
      const queryParams = new URLSearchParams({ timeframe });

      if (ne_lat && ne_lng && sw_lat && sw_lng) {
        queryParams.append('ne_lat', ne_lat.toString());
        queryParams.append('ne_lng', ne_lng.toString());
        queryParams.append('sw_lat', sw_lat.toString());
        queryParams.append('sw_lng', sw_lng.toString());
      }

      if (category) {
        queryParams.append('category', category);
      }

      const response = await api.get(`/map/incidents?${queryParams.toString()}`);

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          incidents: response.data.data.incidents,
          count: response.data.data.count,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch map incidents';
      return { success: false, error: message };
    }
  },
};

/**
 * Stats API functions
 */
export const statsAPI = {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(params = {}) {
    try {
      const { latitude, longitude, radius = 5 } = params;
      const queryParams = new URLSearchParams();

      if (latitude !== undefined && longitude !== undefined) {
        queryParams.append('latitude', latitude.toString());
        queryParams.append('longitude', longitude.toString());
        queryParams.append('radius', radius.toString());
      }

      const response = await api.get(`/stats/dashboard?${queryParams.toString()}`);

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch dashboard stats';
      return { success: false, error: message };
    }
  },

  /**
   * Get area safety score
   */
  async getAreaSafety(latitude, longitude, radius = 5) {
    try {
      const queryParams = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radius.toString(),
      });

      const response = await api.get(`/stats/area-safety?${queryParams.toString()}`);

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch area safety';
      return { success: false, error: message };
    }
  },

  /**
   * Get community statistics
   */
  async getCommunityStats() {
    try {
      const response = await api.get('/stats/community');

      if (response.data.status === 'SUCCESS') {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch community stats';
      return { success: false, error: message };
    }
  },
};

/**
 * Timeline/Comment API
 * Handles incident timeline and comments
 */
export const timelineAPI = {
  /**
   * Get timeline for an incident (comments + status changes)
   */
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

  /**
   * Post a comment on an incident
   */
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

export default api;
