import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import preferenceConstants from '../../../constants/preferences';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const { DEFAULT_PREFERENCES, PREFERENCE_KEYS } = preferenceConstants;
const DEFAULT_STORAGE_KEY = PREFERENCE_KEYS.STORAGE_KEY;

const normalizeStorageSegment = (value) => {
  return String(value || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._@-]/g, '_');
};

const getPreferenceStorageKey = (user) => {
  const userIdentity = user?.user_id || user?.userId || user?.email || 'guest';
  return `${DEFAULT_STORAGE_KEY}_${normalizeStorageSegment(userIdentity)}`;
};

const useUserPreferences = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const storageKey = getPreferenceStorageKey(user);

  const persistPreferences = useCallback(async (key, nextPreferences) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(nextPreferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
      showToast('Failed to save preferences. Please try again.', 'error');
    }
  }, [showToast]);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setPreferences(DEFAULT_PREFERENCES);

    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
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

  return {
    preferences,
    isLoading,
    updatePreference,
    updatePreferences,
    reloadPreferences: loadPreferences,
  };
};

export default useUserPreferences;
