import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';

const IncidentPhotoUploader = ({
  photos,
  onAddPhoto,
  onRemovePhoto,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.inputGroup}>
      <AppText variant="label" style={[styles.label, { color: theme.text }]}>Photos (Optional)</AppText>
      <AppText variant="small" style={[styles.helperText, { color: theme.textSecondary }]}>Add up to 5 photos to support your report</AppText>
      
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
        
        {photos.length < 5 && (
          <TouchableOpacity
            style={[
              styles.addPhotoButton,
              {
                borderColor: theme.inputBorder,
                backgroundColor: theme.surface,
              },
            ]}
            onPress={onAddPhoto}
          >
            <Ionicons name="camera-outline" size={20} color={theme.textSecondary} style={styles.addPhotoIcon} />
            <AppText variant="small" style={[styles.addPhotoText, { color: theme.textSecondary }]}>Add Photo</AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
  },
  helperText: {
    marginTop: 6,
    fontStyle: 'italic',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
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
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  addPhotoIcon: {
    marginBottom: 4,
  },
  addPhotoText: {
  },
});

export default React.memo(IncidentPhotoUploader);
