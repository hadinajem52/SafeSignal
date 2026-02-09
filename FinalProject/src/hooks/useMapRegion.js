import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

const useMapRegion = ({ defaultRegion, mapRef, locationServicesEnabled = true }) => {
  const [region, setRegion] = useState(defaultRegion);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

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

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });

      mapRef?.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    } catch (err) {
      console.error('Error getting location:', err);
    } finally {
      setLocationLoading(false);
    }
  }, [locationServicesEnabled, mapRef]);

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
