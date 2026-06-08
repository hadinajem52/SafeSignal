import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { statsAPI } from '../services/api';
import useUserPreferences from './useUserPreferences';

const LOCATION_STATUS = {
  PENDING: 'pending',
  AVAILABLE: 'available',
  DISABLED: 'disabled',
  PERMISSION_DENIED: 'permission_denied',
  UNAVAILABLE: 'unavailable',
};

// Round coords to roughly 100m precision to reduce cache churn without shifting a 1km score too much.
const roundCoord = (n) => Math.round(n * 1000) / 1000;

const withTimeout = (task, ms) => {
  let id;
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([task(), timeout]).finally(() => clearTimeout(id));
};

const useDashboardData = () => {
  const { preferences, isLoading: preferencesLoading, reloadPreferences } = useUserPreferences();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState(null);
  const [locationIssue, setLocationIssue] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState(LOCATION_STATUS.PENDING);
  const [locationRequestId, setLocationRequestId] = useState(0);
  const runIdRef = useRef(0);

  // Stable rounded coords so cache key doesn't bust on GPS drift
  const roundedLat = location ? roundCoord(location.latitude) : undefined;
  const roundedLng = location ? roundCoord(location.longitude) : undefined;
  const queryKey = ['dashboard', locationStatus, roundedLat, roundedLng];

  // On focus: only reload preferences and invalidate stale data — don't re-trigger GPS
  useFocusEffect(
    useCallback(() => {
      reloadPreferences();
      // Invalidate so React Query refetches if stale, but won't show skeleton
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' });
    }, [reloadPreferences, queryClient])
  );

  const queryFn = useCallback(async () => {
    const params = locationStatus === LOCATION_STATUS.AVAILABLE && location
      ? { latitude: roundedLat, longitude: roundedLng, radius: 1 }
      : {};

    const result = await statsAPI.getDashboardStats(params);
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to load dashboard data');
  }, [location, locationStatus, roundedLat, roundedLng]);

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
    // Fires with no coords for fast first paint after preferences load,
    // then re-fires once location resolves.
    enabled: !preferencesLoading,
  });

  useEffect(() => {
    const currentRunId = ++runIdRef.current;
    const isStale = () => currentRunId !== runIdRef.current;

    const applyLocation = (coords) => {
      if (isStale()) return;
      setLocation(coords);
      setLocationIssue('');
      setLocationStatus(LOCATION_STATUS.AVAILABLE);
      setLocationLoading(false);
    };

    const applyLocationIssue = (status, issue) => {
      if (isStale()) return;
      setLocation(null);
      setLocationIssue(issue);
      setLocationStatus(status);
      setLocationLoading(false);
    };

    if (preferencesLoading) {
      setLocationLoading(false);
      return undefined;
    }

    const requestLocation = async () => {
      if (!preferences.locationServices) {
        applyLocationIssue(
          LOCATION_STATUS.DISABLED,
          'Location is disabled in app preferences.'
        );
        return;
      }

      setLocationLoading(true);
      setLocationIssue('');
      setLocationStatus(LOCATION_STATUS.PENDING);

      try {
        // Quick permission check — 3 s
        const { status } = await withTimeout(
          () => Location.requestForegroundPermissionsAsync(),
          3000
        );
        if (status !== 'granted') {
          applyLocationIssue(
            LOCATION_STATUS.PERMISSION_DENIED,
            'Location permission not granted.'
          );
          return;
        }

        // Try cached last-known position — 2 s, swallow failure
        try {
          const known = await withTimeout(
            () => Location.getLastKnownPositionAsync({ maxAge: 60 * 60 * 1000, requiredAccuracy: 3000 }),
            2000
          );
          if (known?.coords) {
            applyLocation(known.coords);
            return;
          }
        } catch {
          // No cached position — continue
        }

        // Try fresh position — 15 s with balanced accuracy (network + GPS)
        const pos = await withTimeout(
          () => Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          15000
        );
        applyLocation(pos.coords);
      } catch {
        applyLocationIssue(
          LOCATION_STATUS.UNAVAILABLE,
          'Location is temporarily unavailable, so nearby safety cannot be calculated right now.'
        );
      }
    };

    requestLocation();
    return undefined;
  }, [preferences.locationServices, preferencesLoading, locationRequestId]);

  const onRefresh = useCallback(() => {
    setLocation(null);
    setLocationIssue('');
    setLocationStatus(LOCATION_STATUS.PENDING);
    setLocationLoading(Boolean(preferences.locationServices));
    setLocationRequestId((value) => value + 1);
    queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' });
  }, [preferences.locationServices, queryClient]);

  return {
    loading: preferencesLoading || isLoading,
    refreshing: isFetching,
    locationLoading,
    location,
    locationStatus,
    locationIssue,
    dashboardData,
    error: error?.message || null,
    onRefresh,
  };
};

export default useDashboardData;
