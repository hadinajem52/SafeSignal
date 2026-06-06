import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import notificationStore from '../services/notificationStore';

const userKey = (user) => user?.user_id || user?.userId || user?.email || null;

/**
 * Reads the server-backed notification inbox and stays in sync with the store.
 * Fetches on mount, re-fetches/re-scopes when the signed-in user changes, and
 * applies optimistic updates for read/remove/clear actions.
 */
const useNotifications = () => {
  const { user, isAuthenticated } = useAuth();
  const identity = userKey(user);
  const [state, setState] = useState(() => notificationStore.getCache(identity));
  const [loading, setLoading] = useState(() => !notificationStore.getCache(identity).loaded);

  useEffect(() => {
    let active = true;

    const unsubscribe = notificationStore.subscribe((cache) => {
      if (active) {
        setState(cache);
      }
    });

    if (isAuthenticated && identity) {
      const currentCache = notificationStore.getCache(identity);
      setState(currentCache);
      setLoading(!currentCache.loaded);
      notificationStore.fetch(identity).finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    } else {
      notificationStore.reset(null);
      setLoading(false);
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [identity, isAuthenticated]);

  const refresh = useCallback(() => notificationStore.fetch(identity), [identity]);
  const markRead = useCallback((id) => notificationStore.markRead(id, identity), [identity]);
  const markAllRead = useCallback(() => notificationStore.markAllRead(identity), [identity]);
  const remove = useCallback((id) => notificationStore.remove(id, identity), [identity]);
  const clearAll = useCallback(() => notificationStore.clearAll(identity), [identity]);

  const visibleState = isAuthenticated && notificationStore.isCurrentUser(identity)
    ? state
    : notificationStore.getCache(identity);

  return {
    notifications: visibleState.notifications,
    unreadCount: visibleState.unreadCount,
    loading: isAuthenticated && identity ? loading || !notificationStore.isCurrentUser(identity) : false,
    refresh,
    markRead,
    markAllRead,
    remove,
    clearAll,
  };
};

export default useNotifications;
