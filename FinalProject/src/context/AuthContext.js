import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { authAPI, tokenStorage } from '../services/api';

// Create Auth Context
const AuthContext = createContext(null);

/**
 * Get user-specific draft storage key
 */
const getDraftStorageKey = (userId) => `safesignal_incident_draft_${userId}`;

/**
 * Auth Provider Component
 * Manages authentication state throughout the app
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  /**
   * Check if user is already authenticated
   */
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const storedUser = await tokenStorage.getUser();
      const token = await tokenStorage.getToken();

      if (storedUser && token) {
        // Verify token is still valid by fetching profile
        const result = await authAPI.getProfile();
        if (result.success) {
          setUser(result.user);
          setIsAuthenticated(true);
        } else {
          // Token invalid, clear storage
          await tokenStorage.clearAll();
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Auth status check error:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register a new user (now requires verification)
   */
  const register = async (username, email, password) => {
    const result = await authAPI.register(username, email, password);
    // Don't set authenticated here - user needs to verify email first
    return result;
  };

  /**
   * Login user
   */
  const login = async (email, password) => {
    const result = await authAPI.login(email, password);
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
    return result;
  };

  /**
   * Sign in with Google
   */
  const googleSignIn = async (idToken, email, name) => {
    const result = await authAPI.googleSignIn(idToken, email, name);
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
    return result;
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      // Clear user's draft before logging out
      if (user?.user_id || user?.userId) {
        const userId = user.user_id || user.userId;
        const draftKey = getDraftStorageKey(userId);
        await Promise.all([
          SecureStore.deleteItemAsync(draftKey),
          AsyncStorage.removeItem(draftKey),
        ]);
      }
    } catch (error) {
      console.error('Error clearing draft on logout:', error);
    }
    
    await authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  /**
   * Refresh user profile
   */
  const refreshProfile = async () => {
    const result = await authAPI.getProfile();
    if (result.success) {
      setUser(result.user);
      await tokenStorage.setUser(result.user);
    }
    return result;
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    register,
    login,
    googleSignIn,
    logout,
    refreshProfile,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
