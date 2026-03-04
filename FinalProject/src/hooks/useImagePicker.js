import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import limits from '../../../constants/limits';
import { useToast } from '../context/ToastContext';

const { LIMITS } = limits;
const { MAX_PHOTOS } = LIMITS;

const useImagePicker = () => {
  const { showToast } = useToast();
  const [photos, setPhotos] = useState([]);
  // Tracks whether we launched the camera so the AppState listener knows
  // to call getPendingResultAsync on Android (MainActivity can be destroyed
  // while the camera is open, which causes launchCameraAsync to never resolve).
  const cameraActiveRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active' || !cameraActiveRef.current) return;
      cameraActiveRef.current = false;
      try {
        const pending = await ImagePicker.getPendingResultAsync();
        if (pending && !pending.canceled && pending.assets?.[0]) {
          setPhotos((prev) => {
            if (prev.length >= MAX_PHOTOS) return prev;
            return [...prev, pending.assets[0].uri];
          });
        }
      } catch (err) {
        console.error('getPendingResultAsync error:', err);
      }
    });
    return () => subscription.remove();
  }, []);

  const pickImage = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) {
      showToast(`You can only attach up to ${MAX_PHOTOS} photos.`, 'warning');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Photo library permission is needed to choose photos.', 'warning');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('Failed to pick image. Please try again.', 'error');
    }
  }, [photos.length, showToast]);

  const takePhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) {
      showToast(`You can only attach up to ${MAX_PHOTOS} photos.`, 'warning');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('Camera permission is needed to take photos.', 'warning');
        return;
      }

      // Mark camera as active BEFORE launching so the AppState listener can
      // retrieve the result via getPendingResultAsync if the activity is
      // destroyed and recreated on Android while the camera is open.
      cameraActiveRef.current = true;
      let result;
      try {
        result = await ImagePicker.launchCameraAsync({
          // allowsEditing is intentionally omitted for camera:
          // on Android it triggers a crop intent that many devices don't support,
          // causing the result to silently return { canceled: true }.
          quality: 0.8,
        });
      } finally {
        cameraActiveRef.current = false;
      }

      if (!result.canceled && result.assets?.[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      cameraActiveRef.current = false;
      console.error('Error taking photo:', error);
      showToast('Failed to take photo. Please try again.', 'error');
    }
  }, [photos.length, showToast]);

  const removePhoto = useCallback((index) => {
    setPhotos((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }, []);

  return {
    photos,
    setPhotos,
    pickImage,
    takePhoto,
    removePhoto,
  };
};

export default useImagePicker;