import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import preferenceConstants from '../../../constants/preferences';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import logger from '../utils/logger';

const { DEFAULT_PREFERENCES, PREFERENCE_KEYS } = preferenceConstants;
const DEFAULT_STORAGE_KEY = PREFERENCE_KEYS.STORAGE_KEY;

const normalizeStorageSegment = (value) =>
  String(value || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._@-]/g, '_');

const getPreferenceStorageKey = (user) => {
  const userIdentity = user?.user_id || user?.userId || user?.email || 'guest';
  return `${DEFAULT_STORAGE_KEY}_${normalizeStorageSegment(userIdentity)}`;
};

const PreferencesContext = createContext(null);








export const PreferencesProvider = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const storageKey = getPreferenceStorageKey(user);

  const persistPreferences = useCallback(
    async (key, nextPreferences) => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(nextPreferences));
      } catch (error) {
        logger.error('Error saving preferences:', error);
        showToast('Failed to save preferences. Please try again.', 'error');
      }
    },
    [showToast]
  );



  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      setPreferences(
        stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES
      );
    } catch (error) {
      logger.error('Error loading preferences:', error);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreference = useCallback(
    async (key, value) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value };
        persistPreferences(storageKey, next);
        return next;
      });
    },
    [persistPreferences, storageKey]
  );

  const updatePreferences = useCallback(
    async (updates) => {
      setPreferences((prev) => {
        const next = { ...prev, ...updates };
        persistPreferences(storageKey, next);
        return next;
      });
    },
    [persistPreferences, storageKey]
  );



  const value = useMemo(
    () => ({
      preferences,
      isLoading,
      updatePreference,
      updatePreferences,
      reloadPreferences: loadPreferences,
    }),
    [preferences, isLoading, updatePreference, updatePreferences, loadPreferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
