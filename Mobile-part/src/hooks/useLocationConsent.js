import { useCallback } from 'react';
import * as Location from 'expo-location';
import { usePreferences } from '../context/PreferencesContext';
import { userAPI } from '../services/userAPI';













const useLocationConsent = () => {
  const { updatePreference } = usePreferences();

  const disableLocationSharing = useCallback(async () => {
    updatePreference('locationServices', false);
    await userAPI.setLocationConsent(false);
    return { success: true };
  }, [updatePreference]);

  const enableLocationSharing = useCallback(async () => {

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

    }

    return { success: true };
  }, [updatePreference]);

  return { enableLocationSharing, disableLocationSharing };
};

export default useLocationConsent;
