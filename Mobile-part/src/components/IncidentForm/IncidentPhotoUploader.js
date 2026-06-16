import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { getMediaUri } from '../../utils/mediaUtils';

const MAX_PHOTOS = 5;

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
  onRemoveVideo
}) => {
  const { theme } = useTheme();
  const canAddMore = photos.length < MAX_PHOTOS;
  const videoUri = getMediaUri(video);

  return (
    <View style={styles.inputGroup}>
      <View style={styles.sectionHeader}>
        <AppText variant="label" style={{ color: theme.text }}>Photos (optional)</AppText>
        <AppText variant="caption" style={{ color: theme.textSecondary }}>
          {photos.length}/{MAX_PHOTOS}
        </AppText>
      </View>

      <View style={styles.mediaGrid}>
        {photos.map((photo, index) =>
        <View key={index} style={styles.tile}>
            <Image source={{ uri: getMediaUri(photo) }} style={[styles.tileImage, { backgroundColor: theme.surface }]} />
            <TouchableOpacity
            style={styles.removeBadge}
            onPress={() => onRemovePhoto(index)}
            accessibilityRole="button"
            accessibilityLabel={`Remove photo ${index + 1}`}>

              <Ionicons name="close" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {canAddMore &&
        <>
            <TouchableOpacity
            style={[styles.addTile, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}
            onPress={onTakePhoto}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Take photo">

              <Ionicons name="camera-outline" size={20} color={theme.primary} />
              <AppText variant="small" style={{ color: theme.primary }}>Camera</AppText>
            </TouchableOpacity>

            <TouchableOpacity
            style={[styles.addTile, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}
            onPress={onPickImage}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Choose photo from gallery">

              <Ionicons name="image-outline" size={20} color={theme.primary} />
              <AppText variant="small" style={{ color: theme.primary }}>Gallery</AppText>
            </TouchableOpacity>
          </>
        }
      </View>

      {!canAddMore &&
      <AppText variant="caption" style={[styles.helper, { color: theme.textSecondary }]}>
          Maximum of {MAX_PHOTOS} photos added.
        </AppText>
      }

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <AppText variant="label" style={{ color: theme.text }}>Video (optional)</AppText>
      <AppText variant="caption" style={[styles.helper, { color: theme.textSecondary }]}>
        1 clip, up to 10 minutes
      </AppText>

      {isVideoProcessing ?
      <View style={[styles.videoCard, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}>
          <Ionicons name="sync-outline" size={18} color={theme.primary} />
          <View style={styles.videoProcessingContent}>
            <AppText variant="small" style={[styles.videoText, { color: theme.text }]}>Preparing video for upload</AppText>
            <View style={[styles.progressTrack, { backgroundColor: theme.inputBorder }]}>
              <View
              style={[
              styles.progressFill,
              {
                backgroundColor: theme.primary,
                width: `${Math.max(4, videoProcessingProgress || 1)}%`
              }]
              } />

            </View>
            <AppText variant="caption" style={{ color: theme.textSecondary }}>
              {videoProcessingProgress || 1}% compressed
            </AppText>
          </View>
        </View> :
      videoUri ?
      <View style={[styles.videoCard, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}>
          <Ionicons name="videocam-outline" size={18} color={theme.primary} />
          <AppText variant="small" style={[styles.videoText, { color: theme.text }]} numberOfLines={1}>
            {video?.name || 'Selected video'}
          </AppText>
          <TouchableOpacity
          style={styles.removeVideoButton}
          onPress={onRemoveVideo}
          accessibilityRole="button"
          accessibilityLabel="Remove video">

            <Ionicons name="close" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View> :

      <View style={styles.actionRow}>
          <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}
          onPress={onRecordVideo}
          activeOpacity={0.75}>

            <Ionicons name="videocam-outline" size={18} color={theme.primary} style={styles.actionIcon} />
            <AppText variant="small" style={{ color: theme.primary }}>Record Video</AppText>
          </TouchableOpacity>

          <TouchableOpacity
          style={[styles.actionBtn, { borderColor: theme.inputBorder, backgroundColor: theme.surface }]}
          onPress={onPickVideo}
          activeOpacity={0.75}>

            <Ionicons name="film-outline" size={18} color={theme.primary} style={styles.actionIcon} />
            <AppText variant="small" style={{ color: theme.primary }}>Choose Video</AppText>
          </TouchableOpacity>
        </View>
      }
    </View>);

};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  helper: {
    marginBottom: 12
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  tile: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative'
  },
  tileImage: {
    width: '100%',
    height: '100%'
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addTile: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 16,
    marginBottom: 16
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  actionIcon: {
    marginRight: 6
  },
  videoCard: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  videoText: {
    flex: 1
  },
  videoProcessingContent: {
    flex: 1
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4
  },
  progressFill: {
    height: '100%',
    borderRadius: 999
  },
  removeVideoButton: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default React.memo(IncidentPhotoUploader);
