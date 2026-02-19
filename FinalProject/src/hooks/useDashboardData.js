import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { statsAPI } from '../services/api';
import useUserPreferences from './useUserPreferences';

const FALLBACK_COORDS = { latitude: 33.8938, longitude: 35.5018 };
// Round coords to ~1 km precision to avoid cache-busting on minor GPS drift
const roundCoord = (n) => Math.round(n * 100) / 100;

const withTimeout = (task, ms) => {
  let id;
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([task(), timeout]).finally(() => clearTimeout(id));
};

const useDashboardData = () => {
  const { preferences, reloadPreferences } = useUserPreferences();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState(null);
  const [locationIssue, setLocationIssue] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  // Track whether location has been resolved at least once this session
  const locationResolvedRef = useRef(false);
  const runIdRef = useRef(0);

  // Stable rounded coords so cache key doesn't bust on GPS drift
  const roundedLat = location ? roundCoord(location.latitude) : undefined;
  const roundedLng = location ? roundCoord(location.longitude) : undefined;
  const queryKey = ['dashboard', roundedLat, roundedLng];

  // On focus: only reload preferences and invalidate stale data — don't re-trigger GPS
  useFocusEffect(
    useCallback(() => {
      reloadPreferences();
      // Invalidate so React Query refetches if stale, but won't show skeleton
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' });
    }, [reloadPreferences, queryClient])
  );

  const queryFn = useCallback(async () => {
    const params = location
      ? { latitude: roundedLat, longitude: roundedLng, radius: 5 }
      : {};

    const result = await statsAPI.getDashboardStats(params);
    if (result.success) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to load dashboard data');
  }, [location, roundedLat, roundedLng]);

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
    // Always enabled — fires immediately with no coords for fast first paint,
    // then re-fires once location resolves
    enabled: true,
  });

  useEffect(() => {
    const currentRunId = ++runIdRef.current;
    const isStale = () => currentRunId !== runIdRef.current;

    const applyLocation = (coords, issue = '') => {
      if (isStale()) return;
      setLocation(coords);
      setLocationIssue(issue);
      setLocationLoading(false);
      locationResolvedRef.current = true;
    };

    // If location already resolved this session, skip re-fetching GPS
    if (locationResolvedRef.current) return;

    const requestLocation = async () => {
      if (!preferences.locationServices) {
        applyLocation(FALLBACK_COORDS, 'Location is disabled in app preferences.');
        return;
      }

      setLocationLoading(true);
      setLocationIssue('');

      try {
        // Quick permission check — 3 s
        const { status } = await withTimeout(
          () => Location.requestForegroundPermissionsAsync(),
          3000
        );
        if (status !== 'granted') {
          applyLocation(FALLBACK_COORDS, 'Location permission not granted.');
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
        applyLocation(FALLBACK_COORDS);
      }
    };

    requestLocation();
  }, [preferences.locationServices]);

  const onRefresh = useCallback(() => {
    // Allow location re-resolve on explicit pull-to-refresh
    locationResolvedRef.current = false;
    refetch();
  }, [refetch]);

  return {
    loading: isLoading,
    refreshing: isFetching,
    locationLoading,
    location,
    locationIssue,
    dashboardData,
    error: error?.message || null,
    onRefresh,
  };
};

export default useDashboardData;
