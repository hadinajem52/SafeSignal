import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { statsAPI } from '../services/api';

const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (coords = null) => {
    try {
      setError(null);
      const params = coords
        ? { latitude: coords.latitude, longitude: coords.longitude, radius: 5 }
        : {};

      const result = await statsAPI.getDashboardStats(params);

      if (result.success) {
        setDashboardData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc.coords);
        await fetchDashboardData(loc.coords);
      } else {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Location error:', err);
      await fetchDashboardData();
    } finally {
      setLoading(false);
    }
  }, [fetchDashboardData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return {
    loading,
    refreshing,
    location,
    dashboardData,
    error,
    onRefresh,
  };
};

export default useDashboardData;