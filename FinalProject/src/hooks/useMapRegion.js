import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useToast } from '../context/ToastContext';

// expo-location v17+ dropped the 'timeout' option from getCurrentPositionAsync.
// Use Promise.race to enforce a real timeout instead.
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error('Location request timed out'), { code: 'E_LOCATION_TIMEOUT' })),
        ms
      )
    ),
  ]);

/** Resolve the best available coords: cached → balanced (GPS+network). */
const fetchCoords = async () => {
  // 1. Try cached last-known position (instant, may be null)
  const lastKnown = await withTimeout(
    Location.getLastKnownPositionAsync({
      maxAge: 10 * 60 * 1000,
      requiredAccuracy: 5000,
    }),
    2000
  ).catch(() => null);
  if (lastKnown?.coords) return lastKnown.coords;

  // 2. Live fix — Balanced uses both network providers and GPS so it
  //    resolves in 1–3 s in most cases (unlike High which is GPS-only).
  const live = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    12000
  );
  return live.coords;
};

const useMapRegion = ({ defaultRegion, mapRef, locationServicesEnabled = true }) => {
  const { showToast } = useToast();
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
      showToast('Location services are disabled in account settings. Enable them to use My Location.', 'warning');
      return;
    }

    try {
      setLocationLoading(true);

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        // Show the native Google "Turn on Location" in-app dialog.
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          // User tapped "No, thanks" — stop silently.
          return;
        }
      }

      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let status = existingStatus;
      if (existingStatus !== 'granted') {
        ({ status } = await Location.requestForegroundPermissionsAsync());
      }

      if (status !== 'granted') {
        showToast('Location permission is required to show your location on the map.', 'warning');
        return;
      }

      const coords = await fetchCoords();
      centerMapToCoords(coords.latitude, coords.longitude);
    } catch {
      showToast('Could not determine your location. Please check your GPS settings.', 'error');
      mapRef?.current?.animateToRegion(defaultRegion, 1000);
    } finally {
      setLocationLoading(false);
    }
  }, [centerMapToCoords, defaultRegion, locationServicesEnabled, mapRef, showToast]);

  // Auto-fetch real GPS location on mount
  useEffect(() => {
    if (!locationServicesEnabled) return;

    let cancelled = false;

    (async () => {
      try {
        const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
        let status = existingStatus;
        if (existingStatus !== 'granted') {
          ({ status } = await Location.requestForegroundPermissionsAsync());
        }
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
