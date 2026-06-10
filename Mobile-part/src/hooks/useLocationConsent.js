import { useCallback } from 'react';
import * as Location from 'expo-location';
import { usePreferences } from '../context/PreferencesContext';
import { userAPI } from '../services/userAPI';

/**
 * Single source of truth for turning "location sharing" on/off. Wraps the OS
 * permission request, the in-app `locationServices` preference, and the backend
 * consent flag so every entry point (Account toggle, dashboard CTA, first-launch
 * prompt) behaves identically. Flipping the preference here makes LocationContext
 * re-acquire automatically.
 *
 * enableLocationSharing resolves to:
 *   { success: true }
 *   { success: false, reason: 'permission_denied' }
 *   { success: false, reason: 'consent_failed', error }
 */
export const useLocationConsent = () => {
  const { updatePreference } = usePreferences();

  const disableLocationSharing = useCallback(async () => {
    updatePreference('locationServices', false);
    await userAPI.setLocationConsent(false);
    return { success: true };
  }, [updatePreference]);

  const enableLocationSharing = useCallback(async () => {
    // Opens the native OS permission dialog (first time / when undetermined).
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      updatePreference('locationServices', false);
      await userAPI.setLocationConsent(false);
      return { success: false, reason: 'permission_denied' };
    }

    const consentResult = await userAPI.setLocationConsent(true);
    if (!consentResult.success) {
      return { success: false, reason: 'consent_failed', error: consentResult.error };
    }

    updatePreference('locationServices', true);

    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await userAPI.updateLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      // Consent is enabled; location will sync on next app foreground.
    }

    return { success: true };
  }, [updatePreference]);

  return { enableLocationSharing, disableLocationSharing };
};

export default useLocationConsent;
