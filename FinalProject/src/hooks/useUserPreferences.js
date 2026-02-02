import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import preferenceConstants from '../../../constants/preferences';

const { DEFAULT_PREFERENCES, PREFERENCE_KEYS } = preferenceConstants;

const useUserPreferences = () => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  const persistPreferences = useCallback(async (nextPreferences) => {
    try {
      await AsyncStorage.setItem(
        PREFERENCE_KEYS.STORAGE_KEY,
        JSON.stringify(nextPreferences)
      );
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFERENCE_KEYS.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreference = useCallback(
    async (key, value) => {
      setPreferences((prev) => {
        const next = { ...prev, [key]: value };
        persistPreferences(next);
        return next;
      });
    },
    [persistPreferences]
  );

  const updatePreferences = useCallback(
    async (updates) => {
      setPreferences((prev) => {
        const next = { ...prev, ...updates };
        persistPreferences(next);
        return next;
      });
    },
    [persistPreferences]
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
