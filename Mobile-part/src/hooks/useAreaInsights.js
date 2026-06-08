import { useQuery } from '@tanstack/react-query';
import { statsAPI } from '../services/api';
import { useLocation, LOCATION_STATUS } from '../context/LocationContext';

// Match the dashboard's coordinate rounding so the insight query key (and the
// server-side cache it maps to) stays stable across small GPS drift.
const roundCoord = (n) => Math.round(n * 1000) / 1000;

/**
 * Lazy-loaded AI read of recent nearby activity (1 km / 7 days). Sits alongside
 * the dashboard but on its own long-lived query so it doesn't refetch on every
 * focus — the server caches and rate-limits to protect the Gemini token budget,
 * and a 30-minute staleTime keeps the client from asking again needlessly.
 */
const useAreaInsights = () => {
  const { coords, status } = useLocation();
  const latitude = coords ? roundCoord(coords.latitude) : undefined;
  const longitude = coords ? roundCoord(coords.longitude) : undefined;
  const enabled = status === LOCATION_STATUS.AVAILABLE && Boolean(coords);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['areaInsights', latitude, longitude],
    queryFn: async () => {
      const result = await statsAPI.getAreaInsights({ latitude, longitude });
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || 'Failed to load area insights');
    },
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    insight: data || null,
    loading: enabled && isLoading,
    isError,
  };
};

export default useAreaInsights;
