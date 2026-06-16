import { useQuery } from '@tanstack/react-query';
import { statsAPI } from '../services/api';
import { useLocation, LOCATION_STATUS } from '../context/LocationContext';



const roundCoord = (n) => Math.round(n * 1000) / 1000;







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
