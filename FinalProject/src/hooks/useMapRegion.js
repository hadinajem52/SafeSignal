import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

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
  console.log('[MapRegion] fetchCoords — trying getLastKnownPositionAsync...');
  const lastKnown = await withTimeout(
    Location.getLastKnownPositionAsync({
      maxAge: 10 * 60 * 1000,
      requiredAccuracy: 5000,
    }),
    2000
  ).catch((e) => { console.log('[MapRegion] lastKnown failed:', e?.message); return null; });

  console.log('[MapRegion] lastKnown =', lastKnown ? `lat=${lastKnown.coords?.latitude}` : 'null');
  if (lastKnown?.coords) return lastKnown.coords;

  console.log('[MapRegion] no cache — calling getCurrentPositionAsync (Balanced)...');
  const live = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    12000
  );
  console.log('[MapRegion] getCurrentPositionAsync resolved:', live?.coords?.latitude, live?.coords?.longitude);
  return live.coords;
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
    console.log('[MapRegion] goToMyLocation called, locationServicesEnabled=', locationServicesEnabled);
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

      console.log('[MapRegion] checking hasServicesEnabledAsync...');
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      console.log('[MapRegion] hasServicesEnabledAsync =', servicesEnabled);

      if (!servicesEnabled) {
        console.log('[MapRegion] services off — calling enableNetworkProviderAsync...');
        try {
          await Location.enableNetworkProviderAsync();
          console.log('[MapRegion] enableNetworkProviderAsync resolved');
        } catch (e) {
          console.log('[MapRegion] enableNetworkProviderAsync rejected:', e?.message);
          return;
        }
      }

      console.log('[MapRegion] requesting foreground permission...');
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      console.log('[MapRegion] existing permission status =', existingStatus);
      let status = existingStatus;
      if (existingStatus !== 'granted') {
        console.log('[MapRegion] not yet granted — calling requestForegroundPermissionsAsync...');
        ({ status } = await Location.requestForegroundPermissionsAsync());
        console.log('[MapRegion] request result =', status);
      }
      console.log('[MapRegion] permission status =', status);

      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to show your current location on the map.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('[MapRegion] calling fetchCoords...');
      const coords = await fetchCoords();
      console.log('[MapRegion] fetchCoords resolved:', coords?.latitude, coords?.longitude);
      centerMapToCoords(coords.latitude, coords.longitude);
    } catch (e) {
      console.log('[MapRegion] goToMyLocation error:', e?.message, e?.code);
      Alert.alert(
        'Location Unavailable',
        'Could not determine your location. Please check your GPS settings.',
        [{ text: 'OK' }]
      );
      mapRef?.current?.animateToRegion(defaultRegion, 1000);
    } finally {
      console.log('[MapRegion] goToMyLocation finally — clearing loading');
      setLocationLoading(false);
    }
  }, [centerMapToCoords, defaultRegion, locationServicesEnabled, mapRef]);

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
