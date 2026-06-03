import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import useUserPreferences from './useUserPreferences';
import { pushTokenService } from '../services/pushTokenService';

const parseInteger = (value) => {
  const text = String(value || '').trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseCoarseCoordinate = (value, min, max) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const text = String(value).trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) {
    return null;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
};

const getResponseId = (response) => {
  const notification = response?.notification;
  return notification?.request?.identifier || notification?.date || JSON.stringify(notification?.request?.content?.data || {});
};

const parseWitnessPromptData = (data = {}) => {
  if (data.type !== 'witness_prompt') {
    return null;
  }

  const constellationId = parseInteger(data.constellation_id);
  if (!constellationId) {
    return null;
  }

  const coarseLatitude = parseCoarseCoordinate(data.coarse_latitude, -90, 90);
  const coarseLongitude = parseCoarseCoordinate(data.coarse_longitude, -180, 180);
  const params = { constellationId };

  if (coarseLatitude !== null && coarseLongitude !== null) {
    params.coarseLatitude = coarseLatitude;
    params.coarseLongitude = coarseLongitude;
  }

  return params;
};

const parseWitnessPromptResponse = (response) => {
  return parseWitnessPromptData(response?.notification?.request?.content?.data || {});
};

const useWitnessPromptNotifications = ({ navigationRef, isNavigationReady }) => {
  const { isAuthenticated, user } = useAuth();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();
  const pendingPromptRef = useRef(null);
  const lastResponseIdRef = useRef(null);
  const hasLocationConsent = Boolean(preferences.locationServices);

  const navigateIfReady = useCallback((params) => {
    if (!params) {
      return;
    }

    if (!isAuthenticated || !isNavigationReady || !navigationRef.current) {
      pendingPromptRef.current = params;
      return;
    }

    pendingPromptRef.current = null;
    navigationRef.current.navigate('WitnessPrompt', params);
  }, [isAuthenticated, isNavigationReady, navigationRef]);

  const processResponse = useCallback((response) => {
    if (preferencesLoading || !preferences.pushNotifications || !hasLocationConsent) {
      return;
    }

    const responseId = getResponseId(response);
    if (responseId && responseId === lastResponseIdRef.current) {
      return;
    }

    const params = parseWitnessPromptResponse(response);
    if (!params) {
      return;
    }

    lastResponseIdRef.current = responseId;
    navigateIfReady(params);
  }, [hasLocationConsent, navigateIfReady, preferences.pushNotifications, preferencesLoading]);

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

  useEffect(() => {
    if (!isAuthenticated || preferencesLoading) {
      return undefined;
    }

    if (!hasLocationConsent || !preferences.pushNotifications) {
      pushTokenService.clearDevicePushToken();
      return undefined;
    }

    pushTokenService.registerDevicePushToken({ locationConsent: hasLocationConsent });

    const subscription = Notifications.addPushTokenListener((token) => {
      pushTokenService.updateDevicePushToken(token, { locationConsent: hasLocationConsent });
    });

    return () => subscription.remove();
  }, [hasLocationConsent, isAuthenticated, preferences.pushNotifications, preferencesLoading, user?.user_id, user?.userId]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(processResponse);

    Notifications.getLastNotificationResponseAsync()
      .then(processResponse)
      .catch(() => {});

    return () => subscription.remove();
  }, [processResponse]);

  useEffect(() => {
    if (pendingPromptRef.current) {
      navigateIfReady(pendingPromptRef.current);
    }
  }, [isAuthenticated, isNavigationReady, navigateIfReady]);
};

export default useWitnessPromptNotifications;
