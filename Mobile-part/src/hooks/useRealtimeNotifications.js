import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import useUserPreferences from './useUserPreferences';
import { tokenStorage } from '../services/api';
import getSocketUrl from '../utils/socketUrl';
import {
  initializeMobileNotifications,
  displayMobileNotification,
} from '../services/mobileNotifications';
import notificationStore from '../services/notificationStore';
import logger from '../utils/logger';

const MAX_DISPLAYED_EVENT_IDS = 100;

const userKey = (user) => user?.user_id || user?.userId || user?.email || null;

const titleFromPayload = (eventName, payload) => {
  if (payload?.notificationTitle) {
    return payload.notificationTitle;
  }

  if (eventName === 'notification:report_alert') {
    return `High Priority Incident #${payload?.incidentId || ''}`.trim();
  }

  if (eventName === 'notification:report_update') {
    return payload?.notificationTitle || `Report #${payload?.incidentId || ''} updated`.trim();
  }

  if (eventName === 'notification:weekly_digest') {
    return 'Weekly Digest Ready';
  }

  if (eventName === 'notification:email') {
    return payload?.subject || 'SafeSignal Update';
  }

  return 'SafeSignal Notification';
};

const bodyFromPayload = (eventName, payload) => {
  if (payload?.notificationBody) {
    return payload.notificationBody;
  }

  if (eventName === 'notification:report_alert') {
    const severity = payload?.severity ? String(payload.severity).toUpperCase() : 'HIGH';
    const title = payload?.title || 'New incident requires attention';
    return `[${severity}] ${title}`;
  }

  if (eventName === 'notification:weekly_digest') {
    const summary = payload?.summary || {};
    const total = summary.totalReports ?? 0;
    const highPriority = summary.highPriorityReports ?? 0;
    return `${total} total reports this week, ${highPriority} high-priority.`;
  }

  if (eventName === 'notification:report_update') {
    return payload?.message || 'One of your reports was updated.';
  }

  if (eventName === 'notification:email') {
    return payload?.message || 'You have a new update.';
  }

  return payload?.message || 'You have a new notification.';
};

const useRealtimeNotifications = () => {
  const { isAuthenticated, user } = useAuth();
  const identity = userKey(user);
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();
  const socketRef = useRef(null);
  const displayedEventsRef = useRef(new Set());

  useEffect(() => {
    let isMounted = true;

    const disconnectSocket = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      displayedEventsRef.current.clear();
    };

    if (
      !isAuthenticated
      || !identity
      || preferencesLoading
      || !preferences.pushNotifications
    ) {
      disconnectSocket();
      return undefined;
    }

    const setupSocketNotifications = async () => {
      try {
        const initialized = await initializeMobileNotifications();
        if (!initialized || !isMounted) {
          return;
        }

        const token = await tokenStorage.getToken();
        if (!token || !isMounted) {
          return;
        }

        const socket = io(getSocketUrl(), {
          auth: { token },
          transports: ['websocket'],
        });

        if (!isMounted) {
          socket.disconnect();
          return;
        }

        const handleEvent = async (eventName, payload) => {
          if (!preferences.pushNotifications) {
            return;
          }

          const eventId = [
            eventName,
            payload?.incidentId || '',
            payload?.generatedAt || payload?.timestamp || '',
          ].join(':');

          if (displayedEventsRef.current.has(eventId)) {
            return;
          }
          displayedEventsRef.current.add(eventId);
          if (displayedEventsRef.current.size > MAX_DISPLAYED_EVENT_IDS) {
            displayedEventsRef.current.delete(displayedEventsRef.current.values().next().value);
          }

          const title = titleFromPayload(eventName, payload);
          const body = bodyFromPayload(eventName, payload);



          notificationStore.notifyRealtime(identity);

          await displayMobileNotification({
            title,
            body,
            data: {
              eventName,
              incidentId: payload?.incidentId ? String(payload.incidentId) : '',
            },
          });
        };

        socket.on('notification:report_alert', (payload) => {
          handleEvent('notification:report_alert', payload);
        });
        socket.on('notification:report_update', (payload) => {
          handleEvent('notification:report_update', payload);
        });
        socket.on('notification:weekly_digest', (payload) => {
          handleEvent('notification:weekly_digest', payload);
        });
        socket.on('notification:email', (payload) => {
          handleEvent('notification:email', payload);
        });

        socketRef.current = socket;
      } catch (error) {
        logger.error('Failed to setup realtime notifications:', error);
      }
    };

    setupSocketNotifications();

    return () => {
      isMounted = false;
      disconnectSocket();
    };
  }, [identity, isAuthenticated, preferences.pushNotifications, preferencesLoading]);
};

export default useRealtimeNotifications;
