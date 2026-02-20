import { useCallback, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

const DEFAULT_REGION = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// expo-location v17+ dropped the 'timeout' option from getCurrentPositionAsync.
// Use Promise.race to enforce a real timeout instead.
const withTimeout = (promise, ms, code = 'E_LOCATION_TIMEOUT') =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error('Location request timed out'), { code })),
        ms
      )
    ),
  ]);

const useLocationPicker = ({
  onClearLocationError,
  onLocationError,
  locationServicesEnabled = true,
} = {}) => {
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);

  const mapRef = useRef(null);

  const getCurrentLocation = useCallback(async () => {
    if (!locationServicesEnabled) {
      Alert.alert(
        'Location Disabled',
        'Location services are disabled in settings. Enable them to use GPS.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoadingLocation(true);
    onClearLocationError?.();

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setIsLoadingLocation(false);
        Alert.alert(
          'Location Services Off',
          'Location services are disabled. Please enable them to use GPS.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsLoadingLocation(false);
        Alert.alert(
          'Permission Denied',
          'Location permission is required to get your current location. Please enable it in settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      let position;
      try {
        position = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
          15000
        );
      } catch (positionError) {
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000,
          requiredAccuracy: 100,
        });
        if (!lastKnown) {
          throw positionError;
        }
        position = lastKnown;
      }

      const { latitude, longitude } = position.coords;
      const nextLocation = { latitude, longitude };

      setLocation(nextLocation);
      setSelectedMapLocation(nextLocation);

      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (address) {
          const addressParts = [address.street, address.city, address.region].filter(Boolean);
          setLocationName(addressParts.join(', '));
        }
      } catch (geocodeError) {
        console.log('Reverse geocoding failed:', geocodeError);
      }

      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });

      setIsLoadingLocation(false);

      Alert.alert(
        'Location Set',
        `Your location has been captured.\n\nLat: ${latitude.toFixed(6)}\nLng: ${longitude.toFixed(6)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      setIsLoadingLocation(false);
      console.error('Location error:', error);

      let errorMessage = 'Unable to get your current location.';
      if (error?.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Location request timed out. Please try again.';
      } else if (error?.code === 'E_LOCATION_SERVICES_DISABLED') {
        errorMessage = 'Please enable location services in your device settings.';
      }

      onLocationError?.(errorMessage);
      Alert.alert('Location Error', errorMessage);
    }
  }, [locationServicesEnabled, onClearLocationError, onLocationError]);

  const openMapForSelection = useCallback(async () => {
    // If there is already a confirmed location, center on it and open immediately.
    if (location) {
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setSelectedMapLocation(location);
      setShowMapModal(true);
      return;
    }

    // No existing location — open immediately with a sensible default so the
    // modal is never blocked on a slow / missing GPS fix.
    if (!locationServicesEnabled) {
      setMapRegion(DEFAULT_REGION);
      setSelectedMapLocation(null);
      setShowMapModal(true);
      return;
    }

    setMapRegion(DEFAULT_REGION);
    setSelectedMapLocation(null);
    setShowMapModal(true);

    // After the modal is open, quietly try to center on the user's position.
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      let position;
      try {
        position = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          8000
        );
      } catch {
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000,
          requiredAccuracy: 100,
        });
        if (!lastKnown?.coords) {
          return;
        }
        position = lastKnown;
      }

      const { latitude, longitude } = position.coords;
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setSelectedMapLocation({ latitude, longitude });
    } catch (error) {
      console.log('Could not center map on user location:', error);
    }
  }, [location, locationServicesEnabled]);

  const handleMapPress = useCallback(async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedMapLocation({ latitude, longitude });

    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        const addressParts = [address.street, address.city, address.region].filter(Boolean);
        setLocationName(addressParts.join(', '));
      }
    } catch (error) {
      console.log('Reverse geocoding failed:', error);
    }
  }, []);

  const confirmMapLocation = useCallback(() => {
    if (selectedMapLocation) {
      setLocation(selectedMapLocation);
      onClearLocationError?.();
    }
    setShowMapModal(false);
  }, [onClearLocationError, selectedMapLocation]);

  const applyDraftLocation = useCallback((draft) => {
    if (draft?.location) {
      setLocation(draft.location);
      setLocationName(draft.locationName || '');
      setSelectedMapLocation(draft.location);
    }
  }, []);

  return {
    location,
    setLocation,
    locationName,
    setLocationName,
    isLoadingLocation,
    showMapModal,
    setShowMapModal,
    mapRegion,
    setMapRegion,
    selectedMapLocation,
    setSelectedMapLocation,
    mapRef,
    getCurrentLocation,
    openMapForSelection,
    handleMapPress,
    confirmMapLocation,
    applyDraftLocation,
  };
};

export default useLocationPicker;