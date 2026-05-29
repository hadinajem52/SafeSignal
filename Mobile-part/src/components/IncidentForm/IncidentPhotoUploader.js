import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { getMediaUri } from '../../utils/mediaUtils';

/**
 * Props:
 *   photos        - string[]
 *   onTakePhoto   - () => void  (launch camera directly — no modal)
 *   onPickImage   - () => void  (launch gallery directly — no modal)
 *   onRemovePhoto - (index: number) => void
 */
const IncidentPhotoUploader = ({
  photos,
  onTakePhoto,
  onPickImage,
  onRemovePhoto,
  video,
  isVideoProcessing,
  videoProcessingProgress,
  onRecordVideo,
  onPickVideo,
  onRemoveVideo,
}) => {
  const { theme } = useTheme();
  const canAddMore = photos.length < 5;
  const videoUri = getMediaUri(video);

  return (
    <View style={styles.inputGroup}>
      <AppText variant="label" style={[styles.label, { color: theme.text }]}>Photos (Optional)</AppText>
      <AppText variant="small" style={[styles.subLabel, { color: theme.textSecondary }]}>
        Add up to 5 photos to support your report
      </AppText>

      {/* Thumbnail row */}
      <View style={styles.photosContainer}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoWrapper}>
            <Image source={{ uri: getMediaUri(photo) }} style={[styles.photoThumbnail, { backgroundColor: theme.surface }]} />
            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={() => onRemovePhoto(index)}
            >
              <Ionicons name="close" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Inline action buttons — rendered directly, no modal */}
      {canAddMore && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}
            onPress={onTakePhoto}
            activeOpacity={0.75}
          >
            <Ionicons name="camera-outline" size={18} color={theme.primary} style={styles.actionIcon} />
            <AppText variant="small" style={[styles.actionText, { color: theme.primary }]}>Take Photo</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}
            onPress={onPickImage}
            activeOpacity={0.75}
          >
            <Ionicons name="image-outline" size={18} color={theme.primary} style={styles.actionIcon} />
            <AppText variant="small" style={[styles.actionText, { color: theme.primary }]}>Choose from Gallery</AppText>
          </TouchableOpacity>
        </View>
      )}

      <AppText variant="small" style={[styles.subLabel, { color: theme.textSecondary }]}>
        Optional video evidence: 1 clip, up to 10 minutes
      </AppText>
      {isVideoProcessing ? (
        <View style={[styles.videoProcessing, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}>
          <Ionicons name="sync-outline" size={18} color={theme.primary} />
          <View style={styles.videoProcessingContent}>
            <AppText variant="small" style={[styles.videoText, { color: theme.text }]}>Preparing video for upload</AppText>
            <View style={[styles.progressTrack, { backgroundColor: theme.inputBorder }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${Math.max(4, videoProcessingProgress || 1)}%`,
                  },
                ]}
              />
            </View>
            <AppText variant="caption" style={{ color: theme.textSecondary }}>
              {videoProcessingProgress || 1}% compressed
            </AppText>
          </View>
        </View>
      ) : videoUri ? (
        <View style={[styles.videoPreview, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}>
          <Ionicons name="videocam-outline" size={18} color={theme.primary} />
          <AppText variant="small" style={[styles.videoText, { color: theme.text }]} numberOfLines={1}>
            {video?.name || 'Selected video'}
          </AppText>
          <TouchableOpacity style={styles.removeVideoButton} onPress={onRemoveVideo}>
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { borderColor: theme.inputBorder, backgroundColor: theme.surface },
              isVideoProcessing && styles.disabledAction,
            ]}
            onPress={onRecordVideo}
            disabled={isVideoProcessing}
            activeOpacity={0.75}
          >
            <Ionicons name="videocam-outline" size={18} color={theme.primary} style={styles.actionIcon} />
            <AppText variant="small" style={[styles.actionText, { color: theme.primary }]}>Record Video</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              { borderColor: theme.inputBorder, backgroundColor: theme.surface },
              isVideoProcessing && styles.disabledAction,
            ]}
            onPress={onPickVideo}
            disabled={isVideoProcessing}
            activeOpacity={0.75}
          >
            <Ionicons name="film-outline" size={18} color={theme.primary} style={styles.actionIcon} />
            <AppText variant="small" style={[styles.actionText, { color: theme.primary }]}>Choose Video</AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 4,
  },
  subLabel: {
    marginBottom: 12,
    fontStyle: 'italic',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoWrapper: {
    width: 80,
    height: 80,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  actionIcon: {
    marginRight: 6,
  },
  actionText: {},
  videoPreview: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoText: {
    flex: 1,
  },
  videoProcessing: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoProcessingContent: {
    flex: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  disabledAction: {
    opacity: 0.5,
  },
  removeVideoButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(IncidentPhotoUploader);
