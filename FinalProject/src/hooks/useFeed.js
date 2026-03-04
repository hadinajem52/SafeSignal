import { useCallback, useEffect, useRef, useState } from 'react';
import { feedAPI } from '../services/feedAPI';

const PAGE_SIZE = 15;

export default function useFeed(filters = {}) {
  const {
    category,
    closure_outcome,
    severity,
    lat,
    lng,
    radius,
    sort,
  } = filters;
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const activeRequest = useRef(0);
  const isFirstLoad = useRef(true);

  const fetchPage = useCallback(
    async (offset = 0, isRefresh = false) => {
      const reqId = ++activeRequest.current;
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (offset === 0) {
          // First ever load → full loading state; subsequent filter changes → subtle inline indicator
          if (isFirstLoad.current) {
            setLoading(true);
          } else {
            setFiltering(true);
          }
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const result = await feedAPI.getPublicFeed({
          category,
          closure_outcome,
          severity,
          lat,
          lng,
          radius,
          sort,
          limit: PAGE_SIZE,
          offset,
        });
        if (activeRequest.current !== reqId) return;

        if (!result.success) {
          setError(result.error);
          return;
        }
        isFirstLoad.current = false;
        setIncidents(prev =>
          offset === 0 ? result.incidents : [...prev, ...result.incidents],
        );
        setTotal(result.total);
      } catch (e) {
        if (activeRequest.current === reqId) setError('Failed to load feed');
      } finally {
        if (activeRequest.current === reqId) {
          setLoading(false);
          setFiltering(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [category, closure_outcome, severity, lat, lng, radius, sort],
  );

  useEffect(() => {
    fetchPage(0);

    return () => {
      activeRequest.current += 1;
    };
  }, [fetchPage]);

  const refresh = useCallback(() => fetchPage(0, true), [fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || refreshing || loadingMore || incidents.length >= total) return;
    fetchPage(incidents.length);
  }, [fetchPage, incidents.length, loading, loadingMore, refreshing, total]);

  return { incidents, loading, filtering, refreshing, loadingMore, error, total, refresh, loadMore };
}
