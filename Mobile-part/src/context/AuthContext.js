import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import preferenceConstants from '../../../constants/preferences';
import { authAPI, tokenStorage, userAPI } from '../services/api';


const AuthContext = createContext(null);




const getDraftStorageKey = (userId) => `safesignal_incident_draft_${userId}`;
const { DEFAULT_PREFERENCES, PREFERENCE_KEYS } = preferenceConstants;

const normalizeStorageSegment = (value) => String(value || 'guest')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._@-]/g, '_');

const getPreferenceStorageKey = (user) => {
  const userIdentity = user?.user_id || user?.userId || user?.email || 'guest';
  return `${PREFERENCE_KEYS.STORAGE_KEY}_${normalizeStorageSegment(userIdentity)}`;
};

const loadPreferences = async (user) => {
  const stored = await AsyncStorage.getItem(getPreferenceStorageKey(user));
  return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
};





export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);


  useEffect(() => {
    checkAuthStatus();
  }, []);

  const syncConsentedLocation = useCallback(async () => {
    if (!user || !isAuthenticated) {
      return;
    }

    try {
      const preferences = await loadPreferences(user);
      if (!preferences.locationServices) {
        return;
      }

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await userAPI.updateLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      console.log('Location sync skipped:', error?.message || error);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    syncConsentedLocation();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncConsentedLocation();
      }
    });

    return () => subscription.remove();
  }, [syncConsentedLocation]);




  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const storedUser = await tokenStorage.getUser();
      const token = await tokenStorage.getToken();

      if (storedUser && token) {

        const result = await authAPI.getProfile();
        if (result.success) {
          setUser(result.user);
          setIsAuthenticated(true);
        } else {

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




  const login = async (email, password) => {
    const result = await authAPI.login(email, password);
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
    return result;
  };







  const register = async (username, email, password) => {
    const result = await authAPI.register(username, email, password);

    if (result.success && !result.requiresVerification) {
      return login(email, password);
    }

    return result;
  };




  const googleSignIn = async (idToken, email, name) => {
    const result = await authAPI.googleSignIn(idToken, email, name);
    if (result.success) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
    return result;
  };




  const logout = async () => {
    try {

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




export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
