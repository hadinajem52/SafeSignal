import { notificationAPI } from './notificationAPI';

// In-memory sync layer over the backend notification inbox. The server is the
// source of truth; this caches the last fetch, applies optimistic updates, and
// notifies subscribers (the home badge + the Notifications screen) of changes.

const emptyCache = () => ({ notifications: [], unreadCount: 0, loaded: false });

let cache = emptyCache();
const listeners = new Set();
let inFlight = null;
let ownerKey = null;
let generation = 0;
let realtimeTimer = null;

const computeUnread = (list) => list.reduce((count, n) => (n.read ? count : count + 1), 0);

const emit = () => {
  listeners.forEach((listener) => {
    try {
      listener(cache);
    } catch {
      // ignore listener errors
    }
  });
};

const setCache = (next) => {
  cache = next;
  emit();
};

const clearRealtimeTimer = () => {
  if (realtimeTimer) {
    clearTimeout(realtimeTimer);
    realtimeTimer = null;
  }
};

const resetForOwner = (nextOwnerKey) => {
  generation += 1;
  ownerKey = nextOwnerKey || null;
  inFlight = null;
  clearRealtimeTimer();
  setCache(emptyCache());
};

const ensureOwner = (nextOwnerKey) => {
  if (!nextOwnerKey) {
    resetForOwner(null);
    return false;
  }

  if (ownerKey !== nextOwnerKey) {
    resetForOwner(nextOwnerKey);
  }

  return true;
};

const canApplyResult = (requestOwnerKey, requestGeneration) => (
  ownerKey === requestOwnerKey && generation === requestGeneration
);

const notificationStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getCache(userKey) {
    return ownerKey === userKey ? cache : emptyCache();
  },

  isCurrentUser(userKey) {
    return Boolean(userKey) && ownerKey === userKey;
  },

  /** Fetch from the server. Concurrent calls share one request. */
  fetch(userKey) {
    if (!ensureOwner(userKey)) {
      return Promise.resolve(cache);
    }

    if (inFlight?.userKey === userKey) {
      return inFlight.promise;
    }

    const requestGeneration = generation;
    const promise = notificationAPI
      .list()
      .then((res) => {
        if (!canApplyResult(userKey, requestGeneration)) {
          return this.getCache(userKey);
        }

        if (res.success) {
          setCache({ notifications: res.notifications, unreadCount: res.unreadCount, loaded: true });
        } else {
          setCache({ ...cache, loaded: true });
        }
        return cache;
      })
      .finally(() => {
        if (inFlight?.promise === promise) {
          inFlight = null;
        }
      });

    inFlight = { userKey, promise };
    return promise;
  },

  /** A live socket notification arrived — refresh from the server (debounced). */
  notifyRealtime(userKey) {
    if (!ensureOwner(userKey)) {
      return;
    }

    clearRealtimeTimer();
    realtimeTimer = setTimeout(() => {
      realtimeTimer = null;
      this.fetch(userKey);
    }, 500);
  },

  async markRead(id, userKey) {
    if (!ensureOwner(userKey)) {
      return;
    }

    const actionGeneration = generation;
    const notifications = cache.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setCache({ ...cache, notifications, unreadCount: computeUnread(notifications) });
    const res = await notificationAPI.markRead(id);
    if (!res.success && canApplyResult(userKey, actionGeneration)) {
      await this.fetch(userKey);
    }
  },

  async markAllRead(userKey) {
    if (!ensureOwner(userKey)) {
      return;
    }

    const actionGeneration = generation;
    const notifications = cache.notifications.map((n) => ({ ...n, read: true }));
    setCache({ ...cache, notifications, unreadCount: 0 });
    const res = await notificationAPI.markAllRead();
    if (!res.success && canApplyResult(userKey, actionGeneration)) {
      await this.fetch(userKey);
    }
  },

  async remove(id, userKey) {
    if (!ensureOwner(userKey)) {
      return;
    }

    const actionGeneration = generation;
    const notifications = cache.notifications.filter((n) => n.id !== id);
    setCache({ ...cache, notifications, unreadCount: computeUnread(notifications) });
    const res = await notificationAPI.remove(id);
    if (!res.success && canApplyResult(userKey, actionGeneration)) {
      await this.fetch(userKey);
    }
  },

  async clearAll(userKey) {
    if (!ensureOwner(userKey)) {
      return;
    }

    const actionGeneration = generation;
    setCache({ notifications: [], unreadCount: 0, loaded: true });
    const res = await notificationAPI.clearAll();
    if (!res.success && canApplyResult(userKey, actionGeneration)) {
      await this.fetch(userKey);
    }
  },

  /** Drop cached state (call on login/logout) so the next fetch is fresh. */
  reset(nextOwnerKey = null) {
    resetForOwner(nextOwnerKey);
  },
};

export default notificationStore;
