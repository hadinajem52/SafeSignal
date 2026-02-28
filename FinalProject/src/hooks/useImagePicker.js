import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import limits from '../../../constants/limits';
import { useToast } from '../context/ToastContext';

const { LIMITS } = limits;
const { MAX_PHOTOS } = LIMITS;

const useImagePicker = () => {
  const { showToast } = useToast();
  const [photos, setPhotos] = useState([]);

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

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
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