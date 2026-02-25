import api from './apiClient';
import { tokenStorage } from './tokenStorage';
import logger from '../utils/logger';

export const authAPI = {
  async register(username, email, password) {
    try {
      const response = await api.post('/auth/register', {
        username,
        email,
        password,
      });

      if (response.data.status === 'OK') {
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

  async logout() {
    await tokenStorage.clearAll();
    return { success: true };
  },

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

  async isAuthenticated() {
    const token = await tokenStorage.getToken();
    return !!token;
  },

  async getStoredUser() {
    return await tokenStorage.getUser();
  },

  async googleSignIn(idToken, email, name) {
    try {
      const response = await api.post('/auth/google', {
        idToken,
        email,
        name,
      });

      if (response.data.status === 'OK') {
        const { token, user } = response.data.data;
        await tokenStorage.setToken(token);
        await tokenStorage.setUser(user);
        return { success: true, user, token };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      logger.error('Google sign-in API error:', error.response?.data || error.message);
      const message = error.response?.data?.message || 'Google sign-in failed';
      return { success: false, error: message };
    }
  },
};
