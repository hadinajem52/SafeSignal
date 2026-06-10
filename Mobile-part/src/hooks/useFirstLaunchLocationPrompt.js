import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import useLocationConsent from './useLocationConsent';

const FIRST_LAUNCH_KEY = 'safesignal_location_prompt_seen';

/**
 * Shows the native OS location permission prompt once, the first time an
 * authenticated user reaches the app. Previously the app never requested
 * permission on launch, so the dashboard stayed "disabled" until the user found
 * the Account switch. enableLocationSharing both prompts and, if granted, turns
 * on sharing + backend consent. Gated on auth because consent needs a token.
 */
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
        // Opens the native permission dialog; enables sharing if the user allows.
        await enableLocationSharing();
      } catch {
        // Non-fatal: the user can still enable from the dashboard or Account.
      }
    })();
  }, [isAuthenticated, preferencesLoading, enableLocationSharing]);
};

export default useFirstLaunchLocationPrompt;
