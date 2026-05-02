import { useEffect, useState } from 'react';
import { statsAPI } from '../services/api';

export default function useUserStats() {
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    statsAPI
      .getDashboardStats()
      .then((result) => {
        if (cancelled) return;

        if (result.success) {
          setUserStats(result.data?.userStats ?? null);
          return;
        }

        setError(result.error || 'Failed to load user stats');
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || 'Failed to load user stats');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    userStats,
    loading,
    error,
  };
}
