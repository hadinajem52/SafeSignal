import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { statsAPI } from '../services/api';
import useUserPreferences from './useUserPreferences';

const useDashboardData = () => {
  const { preferences } = useUserPreferences();
  const [location, setLocation] = useState(null);
  const queryKey = ['dashboard', location?.latitude, location?.longitude, location?.radius];

  const queryFn = useCallback(async () => {
    const params = location
      ? { latitude: location.latitude, longitude: location.longitude, radius: 5 }
      : {};

    const result = await statsAPI.getDashboardStats(params);
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to load dashboard data');
  }, [location]);

  const {
    data: dashboardData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    let isMounted = true;

    const requestLocation = async () => {
      if (!preferences.locationServices) {
        if (isMounted) {
          setLocation(null);
        }
        return;
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (isMounted) {
          setLocation(loc.coords);
        }
      } catch (err) {
        console.error('Location error:', err);
      }
    };

    requestLocation();

    return () => {
      isMounted = false;
    };
  }, [preferences.locationServices]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    loading: isLoading,
    refreshing: isFetching,
    location,
    dashboardData,
    error: error?.message || null,
    onRefresh,
  };
};

export default useDashboardData;
