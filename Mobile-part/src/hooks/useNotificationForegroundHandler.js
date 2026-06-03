import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import useUserPreferences from './useUserPreferences';
import { parseWitnessPromptData } from './useWitnessPromptNotifications';

const useNotificationForegroundHandler = () => {
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();
  const hasLocationConsent = Boolean(preferences.locationServices);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const isWitnessPrompt = Boolean(
          parseWitnessPromptData(notification?.request?.content?.data || {})
        );
        const shouldShow = Boolean(
          !preferencesLoading
          && preferences.pushNotifications
          && (!isWitnessPrompt || hasLocationConsent)
        );

        return {
          shouldShowBanner: shouldShow,
          shouldShowList: shouldShow,
          shouldPlaySound: shouldShow,
          shouldSetBadge: false,
        };
      },
    });
  }, [hasLocationConsent, preferences.pushNotifications, preferencesLoading]);
};

export default useNotificationForegroundHandler;
