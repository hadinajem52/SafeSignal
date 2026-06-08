import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { useLocation } from '../context/LocationContext';

const useMapRegion = ({ defaultRegion, mapRef }) => {
  const { showToast } = useToast();
  const { coords, loading: locationLoading, locationServicesEnabled, refresh } = useLocation();
  const [region, setRegion] = useState(defaultRegion);
  // Center on the first shared fix only, so foreground re-acquires don't yank
  // the camera back while the user is panning the map.
  const hasCenteredRef = useRef(false);

  const centerMapToCoords = useCallback(
    (latitude, longitude) => {
      const nextRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(nextRegion);
      mapRef?.current?.animateToRegion(nextRegion, 1000);
    },
    [mapRef]
  );

  useEffect(() => {
    if (coords && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      centerMapToCoords(coords.latitude, coords.longitude);
    }
  }, [coords, centerMapToCoords]);

  const goToMyLocation = useCallback(async () => {
    if (!locationServicesEnabled) {
      showToast('Location services are disabled in account settings. Enable them to use My Location.', 'warning');
      return;
    }

    const result = await refresh({ prompt: true });
    if (result) {
      centerMapToCoords(result.latitude, result.longitude);
    } else {
      showToast('Could not determine your location. Please check your GPS settings.', 'error');
      mapRef?.current?.animateToRegion(defaultRegion, 1000);
    }
  }, [centerMapToCoords, defaultRegion, locationServicesEnabled, mapRef, refresh, showToast]);

  const resetToDefaultRegion = useCallback(() => {
    mapRef?.current?.animateToRegion(defaultRegion, 1000);
  }, [defaultRegion, mapRef]);

  return {
    region,
    setRegion,
    userLocation: coords,
    locationLoading,
    goToMyLocation,
    resetToDefaultRegion,
  };
};

export default useMapRegion;
