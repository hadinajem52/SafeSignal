import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

const withTimeout = (task, ms) => {
  let id;
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([task(), timeout]).finally(() => clearTimeout(id));
};

const useMapRegion = ({ defaultRegion, mapRef, locationServicesEnabled = true }) => {
  const [region, setRegion] = useState(defaultRegion);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const centerMapToCoords = useCallback(
    (latitude, longitude) => {
      const nextRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setUserLocation({ latitude, longitude });
      setRegion(nextRegion);
      mapRef?.current?.animateToRegion(nextRegion, 1000);
    },
    [mapRef]
  );

  const goToMyLocation = useCallback(async () => {
    if (!locationServicesEnabled) {
      Alert.alert(
        'Location Disabled',
        'Location services are disabled in account settings. Enable them to use My Location.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLocationLoading(true);

      // Quick permission check — 3 s
      const { status } = await withTimeout(
        () => Location.requestForegroundPermissionsAsync(),
        3000
      );
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to show your current location on the map.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Try cached last-known position — 2 s, swallow failure
      try {
        const lastKnown = await withTimeout(
          () => Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000, requiredAccuracy: 3000 }),
          2000
        );
        if (lastKnown?.coords) {
          centerMapToCoords(lastKnown.coords.latitude, lastKnown.coords.longitude);
          return;
        }
      } catch {
        // No cached position — continue
      }

      // Try fresh position — 15 s with balanced accuracy (network + GPS)
      const location = await withTimeout(
        () => Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        15000
      );
      centerMapToCoords(location.coords.latitude, location.coords.longitude);
    } catch {
      // All attempts failed — snap to default region
      centerMapToCoords(defaultRegion.latitude, defaultRegion.longitude);
    } finally {
      setLocationLoading(false);
    }
  }, [centerMapToCoords, defaultRegion, locationServicesEnabled]);

  const resetToDefaultRegion = useCallback(() => {
    mapRef?.current?.animateToRegion(defaultRegion, 1000);
  }, [defaultRegion, mapRef]);

  return {
    region,
    setRegion,
    userLocation,
    locationLoading,
    goToMyLocation,
    resetToDefaultRegion,
  };
};

export default useMapRegion;
