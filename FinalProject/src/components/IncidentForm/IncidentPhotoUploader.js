import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';

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
}) => {
  const { theme } = useTheme();
  const canAddMore = photos.length < 5;

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
            <Image source={{ uri: photo }} style={[styles.photoThumbnail, { backgroundColor: theme.surface }]} />
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
});

export default React.memo(IncidentPhotoUploader);
