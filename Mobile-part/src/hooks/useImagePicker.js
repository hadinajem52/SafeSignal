import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import limits from '../../../constants/limits';
import { useToast } from '../context/ToastContext';

const { LIMITS } = limits;
const { MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_MINUTES } = LIMITS;
const VIDEO_QUALITY = ImagePicker.UIImagePickerControllerQualityType?.Low ?? 2;
const VIDEO_EXPORT_PRESET = ImagePicker.VideoExportPreset?.MediumQuality;

const formatMegabytes = (bytes) => `${Math.ceil(bytes / (1024 * 1024))} MB`;

const createMedia = (asset, fallbackType) => {
  if (!asset?.uri) return null;
  return {
    uri: asset.uri,
    name: asset.fileName || asset.uri.split('/').pop() || `incident-media-${Date.now()}`,
    mimeType: asset.mimeType || fallbackType,
    duration: asset.duration || null,
    fileSize: Number(asset.fileSize || asset.size || 0) || null,
  };
};

const useImagePicker = () => {
  const { showToast } = useToast();
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
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
          const photo = createMedia(pending.assets[0], 'image/jpeg');
          if (!photo) return;

          setPhotos((prev) => {
            if (prev.length >= MAX_PHOTOS) return prev;
            return [...prev, photo];
          });
        }
      } catch (err) {
        console.error('getPendingResultAsync error:', err);
      }
    });
    return () => subscription.remove();
  }, []);

  const validatePhoto = useCallback((asset) => {
    const fileSize = Number(asset?.fileSize || asset?.size || 0);

    if (fileSize > MAX_PHOTO_BYTES) {
      showToast(`Each photo must be ${formatMegabytes(MAX_PHOTO_BYTES)} or smaller.`, 'warning');
      return false;
    }

    return true;
  }, [showToast]);

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
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0] && validatePhoto(result.assets[0])) {
        const photo = createMedia(result.assets[0], 'image/jpeg');
        if (photo) {
          setPhotos((prev) => [...prev, photo]);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('Failed to pick image. Please try again.', 'error');
    }
  }, [photos.length, showToast, validatePhoto]);

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
          quality: 0.7,
        });
      } finally {
        cameraActiveRef.current = false;
      }

      if (!result.canceled && result.assets?.[0] && validatePhoto(result.assets[0])) {
        const photo = createMedia(result.assets[0], 'image/jpeg');
        if (photo) {
          setPhotos((prev) => [...prev, photo]);
        }
      }
    } catch (error) {
      cameraActiveRef.current = false;
      console.error('Error taking photo:', error);
      showToast('Failed to take photo. Please try again.', 'error');
    }
  }, [photos.length, showToast, validatePhoto]);

  const removePhoto = useCallback((index) => {
    setPhotos((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }, []);

  const validateVideo = useCallback((asset) => {
    const durationMs = Number(asset?.duration || 0);
    const fileSize = Number(asset?.fileSize || asset?.size || 0);
    const maxDurationMs = MAX_VIDEO_MINUTES * 60 * 1000;

    if (durationMs > maxDurationMs) {
      showToast(`Video must be ${MAX_VIDEO_MINUTES} minutes or shorter.`, 'warning');
      return false;
    }

    if (fileSize > MAX_VIDEO_BYTES) {
      showToast(`Video must be ${formatMegabytes(MAX_VIDEO_BYTES)} or smaller.`, 'warning');
      return false;
    }

    return true;
  }, [showToast]);

  const pickVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Photo library permission is needed to choose a video.', 'warning');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        videoMaxDuration: MAX_VIDEO_MINUTES * 60,
        videoExportPreset: VIDEO_EXPORT_PRESET,
      });

      if (!result.canceled && result.assets?.[0] && validateVideo(result.assets[0])) {
        setVideo(createMedia(result.assets[0], 'video/mp4'));
      }
    } catch (error) {
      console.error('Error picking video:', error);
      showToast('Failed to pick video. Please try again.', 'error');
    }
  }, [showToast, validateVideo]);

  const recordVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast('Camera permission is needed to record video.', 'warning');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: MAX_VIDEO_MINUTES * 60,
        videoQuality: VIDEO_QUALITY,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0] && validateVideo(result.assets[0])) {
        setVideo(createMedia(result.assets[0], 'video/mp4'));
      }
    } catch (error) {
      console.error('Error recording video:', error);
      showToast('Failed to record video. Please try again.', 'error');
    }
  }, [showToast, validateVideo]);

  return {
    photos,
    setPhotos,
    video,
    setVideo,
    pickImage,
    takePhoto,
    pickVideo,
    recordVideo,
    removePhoto,
    removeVideo: () => setVideo(null),
  };
};

export default useImagePicker;
