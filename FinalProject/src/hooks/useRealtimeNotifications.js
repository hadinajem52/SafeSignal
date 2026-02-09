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

const titleFromPayload = (eventName, payload) => {
  if (eventName === 'notification:report_alert') {
    return `High Priority Incident #${payload?.incidentId || ''}`.trim();
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

  if (eventName === 'notification:email') {
    return payload?.message || 'You have a new update.';
  }

  return payload?.message || 'You have a new notification.';
};

const useRealtimeNotifications = () => {
  const { isAuthenticated, user } = useAuth();
  const { preferences } = useUserPreferences();
  const socketRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const disconnectSocket = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };

    if (!isAuthenticated || !preferences.pushNotifications) {
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

        const handleEvent = async (eventName, payload) => {
          if (!preferences.pushNotifications) {
            return;
          }

          await displayMobileNotification({
            title: titleFromPayload(eventName, payload),
            body: bodyFromPayload(eventName, payload),
            data: {
              eventName,
              incidentId: payload?.incidentId ? String(payload.incidentId) : '',
            },
          });
        };

        socket.on('notification:report_alert', (payload) => {
          handleEvent('notification:report_alert', payload);
        });
        socket.on('notification:weekly_digest', (payload) => {
          handleEvent('notification:weekly_digest', payload);
        });
        socket.on('notification:email', (payload) => {
          handleEvent('notification:email', payload);
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('Failed to setup realtime notifications:', error);
      }
    };

    setupSocketNotifications();

    return () => {
      isMounted = false;
      disconnectSocket();
    };
  }, [isAuthenticated, preferences.pushNotifications, user?.user_id, user?.userId]);
};

export default useRealtimeNotifications;
