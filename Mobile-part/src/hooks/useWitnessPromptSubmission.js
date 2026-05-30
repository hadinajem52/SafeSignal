import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { constellationAPI } from '../services/constellationAPI';

const getOptionalDeviceLocation = async () => {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    return {};
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      deviceLatitude: position.coords.latitude,
      deviceLongitude: position.coords.longitude,
    };
  } catch {
    return {};
  }
};

const useWitnessPromptSubmission = ({ constellationId, onSuccess } = {}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(async ({ signalType, note }) => {
    if (!constellationId || !signalType || submitting) {
      return { success: false, error: 'Choose a response before submitting.' };
    }

    setSubmitting(true);
    setError(null);

    try {
      const deviceLocation = await getOptionalDeviceLocation();
      const result = await constellationAPI.submitCorroboration({
        constellationId,
        signalType,
        note,
        ...deviceLocation,
      });

      if (!result.success) {
        setError(result.error);
        return result;
      }

      onSuccess?.(result.data);
      return result;
    } finally {
      setSubmitting(false);
    }
  }, [constellationId, onSuccess, submitting]);

  return {
    submitting,
    error,
    setError,
    submit,
  };
};

export default useWitnessPromptSubmission;
