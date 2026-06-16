import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { flushReportQueue } from '../utils/offlineReportQueue';

export default function useOfflineReportSync() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;

    const run = async () => {
      const result = await flushReportQueue();
      if (cancelled) return;
      if (result.sent > 0) {
        showToast(
          `${result.sent} offline report${result.sent > 1 ? 's' : ''} submitted.`,
          'success'
        );
      }
      if (result.dropped > 0) {
        showToast(
          `${result.dropped} offline report${result.dropped > 1 ? 's' : ''} couldn't be submitted and ${result.dropped > 1 ? 'were' : 'was'} removed.`,
          'error'
        );
      }
    };

    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [isAuthenticated, showToast]);
}
