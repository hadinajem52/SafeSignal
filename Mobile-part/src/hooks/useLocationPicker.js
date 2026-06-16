import { useCallback, useRef, useState } from 'react';
import { Linking } from 'react-native';
import * as Location from 'expo-location';
import { useToast } from '../context/ToastContext';

const DEFAULT_REGION = {
  latitude: 33.8938,
  longitude: 35.5018,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};



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
  const { showToast } = useToast();
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);

  const mapRef = useRef(null);

  const getCurrentLocation = useCallback(async () => {
    if (!locationServicesEnabled) {
      showToast('Location services are disabled in settings. Enable them to use GPS.', 'warning');
      return;
    }

    setIsLoadingLocation(true);
    onClearLocationError?.();

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {


        try {
          await Location.enableNetworkProviderAsync();
        } catch {

          setIsLoadingLocation(false);
          return;
        }
      }

      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let status = existingStatus;
      if (existingStatus !== 'granted') {
        ({ status } = await Location.requestForegroundPermissionsAsync());
      }

      if (status !== 'granted') {
        setIsLoadingLocation(false);
        showToast('Location permission is required. Enable it in device Settings.', 'warning');
        Linking.openSettings().catch(() => {});
        return;
      }

      let position;


      const lastKnownFast = await withTimeout(
        Location.getLastKnownPositionAsync({
          maxAge: 10 * 60 * 1000,
          requiredAccuracy: 2000,
        }),
        2000
      ).catch(() => null);

      if (lastKnownFast?.coords) {
        position = lastKnownFast;
      } else {


        try {
          position = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            12000
          );
        } catch (positionError) {

          const lastKnownStale = await withTimeout(
            Location.getLastKnownPositionAsync({
              maxAge: 60 * 60 * 1000,
              requiredAccuracy: 10000,
            }),
            2000
          ).catch(() => null);

          if (!lastKnownStale?.coords) {
            throw positionError;
          }
          position = lastKnownStale;
        }
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
      showToast(errorMessage, 'error');
    }
  }, [locationServicesEnabled, onClearLocationError, onLocationError, showToast]);

  const openMapForSelection = useCallback(async () => {

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



    if (!locationServicesEnabled) {
      setMapRegion(DEFAULT_REGION);
      setSelectedMapLocation(null);
      setShowMapModal(true);
      return;
    }

    setMapRegion(DEFAULT_REGION);
    setSelectedMapLocation(null);
    setShowMapModal(true);


    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {

        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          return;
        }
      }

      const { status: existingOpenStatus } = await Location.getForegroundPermissionsAsync();
      let openStatus = existingOpenStatus;
      if (existingOpenStatus !== 'granted') {
        ({ status: openStatus } = await Location.requestForegroundPermissionsAsync());
      }
      if (openStatus !== 'granted') {
        return;
      }

      let position;
      try {
        position = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          8000
        );
      } catch {
        let lastKnown = null;
        try {
          lastKnown = await withTimeout(
            Location.getLastKnownPositionAsync({
              maxAge: 5 * 60 * 1000,
              requiredAccuracy: 1000,
            }),
            3000
          );
        } catch {

        }
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
