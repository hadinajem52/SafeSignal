import * as SecureStore from 'expo-secure-store';
import logger from '../utils/logger';

const TOKEN_KEY = 'safesignal_auth_token';
const USER_KEY = 'safesignal_user_data';

export const tokenStorage = {
  async setToken(token) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      return true;
    } catch (error) {
      logger.error('Error storing token:', error);
      return false;
    }
  },

  async getToken() {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      logger.error('Error retrieving token:', error);
      return null;
    }
  },

  async removeToken() {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      return true;
    } catch (error) {
      logger.error('Error removing token:', error);
      return false;
    }
  },

  async setUser(user) {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      logger.error('Error storing user data:', error);
      return false;
    }
  },

  async getUser() {
    try {
      const data = await SecureStore.getItemAsync(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error retrieving user data:', error);
      return null;
    }
  },

  async removeUser() {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
      return true;
    } catch (error) {
      logger.error('Error removing user data:', error);
      return false;
    }
  },

  async clearAll() {
    await this.removeToken();
    await this.removeUser();
  },
};
