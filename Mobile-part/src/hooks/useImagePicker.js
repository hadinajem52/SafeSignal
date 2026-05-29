import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Video } from 'react-native-compressor';
import limits from '../../../constants/limits';
import { useToast } from '../context/ToastContext';

const { LIMITS } = limits;
const { MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_MINUTES } = LIMITS;
const VIDEO_QUALITY = ImagePicker.UIImagePickerControllerQualityType?.Low ?? 2;
const VIDEO_EXPORT_PRESET = ImagePicker.VideoExportPreset?.MediumQuality;
const VIDEO_COMPRESSION_MAX_SIZE = 1280;
const VIDEO_COMPRESSION_BITRATE = 2_000_000;

const formatMegabytes = (bytes) => `${Math.ceil(bytes / (1024 * 1024))} MB`;

const normalizeProgress = (progress) => {
  const value = Number(progress || 0);
  return Math.max(0, Math.min(100, Math.round(value > 1 ? value : value * 100)));
};

const getFileSize = async (uri) => {
  if (!uri) return 0;

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
    return fileInfo.exists ? Number(fileInfo.size || 0) : 0;
  } catch (_error) {
    return 0;
  }
};

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
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [videoProcessingProgress, setVideoProcessingProgress] = useState(0);
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

  const validateVideoDuration = useCallback((asset) => {
    const durationMs = Number(asset?.duration || 0);
    const maxDurationMs = MAX_VIDEO_MINUTES * 60 * 1000;

    if (durationMs > maxDurationMs) {
      showToast(`Video must be ${MAX_VIDEO_MINUTES} minutes or shorter.`, 'warning');
      return false;
    }

    return true;
  }, [showToast]);

  const validatePreparedVideo = useCallback((media) => {
    const fileSize = Number(media?.fileSize || 0);

    if (fileSize > MAX_VIDEO_BYTES) {
      showToast(`Video must be ${formatMegabytes(MAX_VIDEO_BYTES)} or smaller.`, 'warning');
      return false;
    }

    return true;
  }, [showToast]);

  const prepareVideo = useCallback(async (asset) => {
    if (!asset?.uri || !validateVideoDuration(asset)) return null;

    setIsVideoProcessing(true);
    setVideoProcessingProgress(1);

    try {
      const originalSize = Number(asset.fileSize || asset.size || 0) || await getFileSize(asset.uri);
      const compressedUri = await Video.compress(
        asset.uri,
        {
          compressionMethod: 'manual',
          bitrate: VIDEO_COMPRESSION_BITRATE,
          maxSize: VIDEO_COMPRESSION_MAX_SIZE,
          minimumFileSizeForCompress: 0,
        },
        (progress) => setVideoProcessingProgress(normalizeProgress(progress)),
      );
      const compressedSize = await getFileSize(compressedUri);
      const preparedVideo = createMedia(
        {
          ...asset,
          uri: compressedUri,
          fileName: asset.fileName || `incident-video-${Date.now()}.mp4`,
          fileSize: compressedSize || originalSize,
        },
        'video/mp4',
      );

      setVideoProcessingProgress(100);

      if (!validatePreparedVideo(preparedVideo)) return null;

      console.log('Video prepared for upload:', {
        originalBytes: originalSize,
        compressedBytes: preparedVideo.fileSize,
        durationMs: preparedVideo.duration,
      });

      return preparedVideo;
    } catch (error) {
      console.error('Video compression error:', error);
      showToast('Could not prepare video for upload. Please try a shorter clip.', 'error');
      return null;
    } finally {
      setIsVideoProcessing(false);
      setVideoProcessingProgress(0);
    }
  }, [showToast, validatePreparedVideo, validateVideoDuration]);

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

      if (!result.canceled && result.assets?.[0]) {
        setVideo(null);
        const preparedVideo = await prepareVideo(result.assets[0]);
        if (preparedVideo) setVideo(preparedVideo);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      showToast('Failed to pick video. Please try again.', 'error');
    }
  }, [showToast, prepareVideo]);

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

      if (!result.canceled && result.assets?.[0]) {
        setVideo(null);
        const preparedVideo = await prepareVideo(result.assets[0]);
        if (preparedVideo) setVideo(preparedVideo);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      showToast('Failed to record video. Please try again.', 'error');
    }
  }, [showToast, prepareVideo]);

  return {
    photos,
    setPhotos,
    video,
    setVideo,
    isVideoProcessing,
    videoProcessingProgress,
    pickImage,
    takePhoto,
    pickVideo,
    recordVideo,
    removePhoto,
    removeVideo: () => setVideo(null),
  };
};

export default useImagePicker;
