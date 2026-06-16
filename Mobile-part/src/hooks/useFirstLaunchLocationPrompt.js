import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import useLocationConsent from './useLocationConsent';

const FIRST_LAUNCH_KEY = 'safesignal_location_prompt_seen';








const useFirstLaunchLocationPrompt = () => {
  const { isAuthenticated } = useAuth();
  const { isLoading: preferencesLoading } = usePreferences();
  const { enableLocationSharing } = useLocationConsent();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || preferencesLoading || hasRun.current) return;
    hasRun.current = true;

    (async () => {
      try {
        const seen = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
        if (seen) return;
        await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');

        await enableLocationSharing();
      } catch {

      }
    })();
  }, [isAuthenticated, preferencesLoading, enableLocationSharing]);
};

export default useFirstLaunchLocationPrompt;
