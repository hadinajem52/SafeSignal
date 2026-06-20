import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { usePreferences } from './PreferencesContext';

export const LOCATION_STATUS = {
  PENDING: 'pending',
  AVAILABLE: 'available',
  DISABLED: 'disabled',
  PERMISSION_DENIED: 'permission_denied',
  UNAVAILABLE: 'unavailable',
};


const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(Object.assign(new Error('Location request timed out'), { code: 'E_LOCATION_TIMEOUT' })),
        ms
      )
    ),
  ]);



const fetchCoords = async () => {
  const lastKnown = await withTimeout(
    Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000, requiredAccuracy: 5000 }),
    2000
  ).catch(() => null);
  if (lastKnown?.coords) return lastKnown.coords;

  const live = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    12000
  );
  return live.coords;
};

const LocationContext = createContext(null);







export const LocationProvider = ({ children }) => {
  const { preferences, isLoading: preferencesLoading } = usePreferences();
  const locationServices = preferences.locationServices;

  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState(LOCATION_STATUS.PENDING);
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);

  const runIdRef = useRef(0);

  const acquire = useCallback(
    async ({ prompt = false } = {}) => {
      const runId = ++runIdRef.current;
      const isStale = () => runId !== runIdRef.current;

      if (!locationServices) {
        setCoords(null);
        setStatus(LOCATION_STATUS.DISABLED);
        setIssue('Location sharing is off. Enable it to see your area activity score.');
        setLoading(false);
        return null;
      }

      setLoading(true);
      setStatus(LOCATION_STATUS.PENDING);
      setIssue('');

      try {


        if (prompt) {
          const servicesEnabled = await Location.hasServicesEnabledAsync();
          if (!servicesEnabled) {
            try {
              await Location.enableNetworkProviderAsync();
            } catch {

              setLoading(false);
              return null;
            }
          }
        }


        const { status: existing } = await Location.getForegroundPermissionsAsync();
        let permission = existing;
        if (existing !== 'granted' && prompt) {
          ({ status: permission } = await Location.requestForegroundPermissionsAsync());
        }

        if (permission !== 'granted') {
          if (isStale()) return null;
          setCoords(null);
          setStatus(LOCATION_STATUS.PERMISSION_DENIED);
          setIssue('Location permission not granted.');
          setLoading(false);
          return null;
        }

        const next = await fetchCoords();
        if (isStale()) return null;
        const value = { latitude: next.latitude, longitude: next.longitude };
        setCoords(value);
        setStatus(LOCATION_STATUS.AVAILABLE);
        setIssue('');
        setLoading(false);
        return value;
      } catch {
        if (isStale()) return null;
        setStatus(LOCATION_STATUS.UNAVAILABLE);
        setIssue('Location is temporarily unavailable, so nearby safety cannot be calculated right now.');
        setLoading(false);
        return null;
      }
    },
    [locationServices]
  );


  useEffect(() => {
    if (preferencesLoading) return;
    acquire({ prompt: false });
  }, [preferencesLoading, acquire]);



  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !preferencesLoading && locationServices) {
        acquire({ prompt: false });
      }
    });
    return () => subscription.remove();
  }, [acquire, preferencesLoading, locationServices]);

  const refresh = useCallback((options) => acquire({ prompt: true, ...options }), [acquire]);

  const value = useMemo(
    () => ({
      coords,
      status,
      issue,
      loading,
      locationServicesEnabled: locationServices,
      preferencesLoading,
      refresh,
      acquire,
    }),
    [coords, status, issue, loading, locationServices, preferencesLoading, refresh, acquire],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
