import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import preferenceConstants from '../../../constants/preferences';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

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

/**
 * Single source of truth for user preferences across the app. Previously each
 * screen mounted its own useUserPreferences() state, so the Map and Dashboard
 * could hold different values and reloaded (resetting to defaults) on every
 * focus — which momentarily flipped locationServices off. One shared provider
 * loads once and stays consistent.
 */
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
        console.error('Error saving preferences:', error);
        showToast('Failed to save preferences. Please try again.', 'error');
      }
    },
    [showToast]
  );

  // Note: unlike the old hook, this does NOT reset to defaults before reading.
  // Resetting caused a transient locationServices=false that disabled location.
  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      setPreferences(
        stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES
      );
    } catch (error) {
      console.error('Error loading preferences:', error);
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

  // Stable identity so consumers (every screen reading preferences) don't re-render
  // on unrelated provider renders. The functions below are already useCallback'd.
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

export default PreferencesContext;
