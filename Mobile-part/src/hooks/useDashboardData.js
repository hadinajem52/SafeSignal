import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { statsAPI } from '../services/api';
import { useLocation, LOCATION_STATUS } from '../context/LocationContext';

// Round coords to roughly 100m precision to reduce cache churn without shifting a 1km score too much.
const roundCoord = (n) => Math.round(n * 1000) / 1000;

const useDashboardData = () => {
  const queryClient = useQueryClient();
  const {
    coords,
    status: locationStatus,
    issue: locationIssue,
    loading: locationLoading,
    preferencesLoading,
    refresh,
  } = useLocation();

  // Stable rounded coords so cache key doesn't bust on GPS drift
  const roundedLat = coords ? roundCoord(coords.latitude) : undefined;
  const roundedLng = coords ? roundCoord(coords.longitude) : undefined;
  const hasCoords = locationStatus === LOCATION_STATUS.AVAILABLE && Boolean(coords);
  const queryKey = ['dashboard', locationStatus, roundedLat, roundedLng];

  // On focus: invalidate stale data so React Query refetches if needed.
  // Location itself is owned by LocationProvider, so no GPS re-trigger here.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' });
    }, [queryClient])
  );

  const queryFn = useCallback(async () => {
    const params = hasCoords ? { latitude: roundedLat, longitude: roundedLng, radius: 0.5 } : {};

    const result = await statsAPI.getDashboardStats(params);
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to load dashboard data');
  }, [hasCoords, roundedLat, roundedLng]);

  const {
    data: dashboardData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey,
    queryFn,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    // Fires with no coords for fast first paint, then re-fires once the shared
    // location resolves and the query key picks up the rounded coords.
    enabled: !preferencesLoading,
  });

  const onRefresh = useCallback(() => {
    refresh({ prompt: false });
    queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' });
  }, [refresh, queryClient]);

  return {
    loading: preferencesLoading || isLoading,
    refreshing: isFetching,
    locationLoading,
    location: coords,
    locationStatus,
    locationIssue,
    dashboardData,
    error: error?.message || null,
    onRefresh,
  };
};

export default useDashboardData;
