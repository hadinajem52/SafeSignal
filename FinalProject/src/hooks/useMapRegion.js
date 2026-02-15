import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

/** Resolve the best available coords: cached → low-accuracy (network) → balanced (GPS). */
const fetchCoords = async () => {
  // 1. Try cached last-known position (instant, may be null)
  try {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 10 * 60 * 1000,   // accept positions up to 10 min old
      requiredAccuracy: 5000,    // 5 km — loose enough to always hit
    });
    if (lastKnown?.coords) return lastKnown.coords;
  } catch {
    // no cached fix — continue
  }

  // 2. Quick network-based fix (WiFi / cell tower, usually < 3 s)
  try {
    const quick = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    if (quick?.coords) return quick.coords;
  } catch {
    // network fix unavailable — continue
  }

  // 3. Full GPS fix — let expo handle its own internal timeout
  const gps = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return gps.coords;
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

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to show your current location on the map.',
          [{ text: 'OK' }]
        );
        return;
      }

      const coords = await fetchCoords();
      centerMapToCoords(coords.latitude, coords.longitude);
    } catch {
      Alert.alert(
        'Location Unavailable',
        'Could not determine your location. Please check your GPS settings.',
        [{ text: 'OK' }]
      );
      mapRef?.current?.animateToRegion(defaultRegion, 1000);
    } finally {
      setLocationLoading(false);
    }
  }, [centerMapToCoords, defaultRegion, locationServicesEnabled, mapRef]);

  // Auto-fetch real GPS location on mount
  useEffect(() => {
    if (!locationServicesEnabled) return;

    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        const coords = await fetchCoords();
        if (!cancelled) {
          centerMapToCoords(coords.latitude, coords.longitude);
        }
      } catch {
        // GPS unavailable on mount — stay on default region silently
      }
    })();

    return () => { cancelled = true; };
  }, [centerMapToCoords, locationServicesEnabled]);

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
