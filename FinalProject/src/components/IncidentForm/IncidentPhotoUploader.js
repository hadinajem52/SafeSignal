import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const IncidentPhotoUploader = ({
  photos,
  onAddPhoto,
  onRemovePhoto,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.text }]}>Photos (Optional)</Text>
      <Text style={[styles.helperText, { color: theme.textSecondary }]}>Add up to 5 photos to support your report</Text>
      
      <View style={styles.photosContainer}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoWrapper}>
            <Image source={{ uri: photo }} style={[styles.photoThumbnail, { backgroundColor: theme.surface }]} />
            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={() => onRemovePhoto(index)}
            >
              <Text style={styles.removePhotoText}>×</Text>
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
            <Text style={styles.addPhotoIcon}>📷</Text>
            <Text style={[styles.addPhotoText, { color: theme.textSecondary }]}>Add Photo</Text>
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
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
    backgroundColor: '#eee',
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
  removePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: -2,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  addPhotoIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 10,
    color: '#666',
  },
});

export default IncidentPhotoUploader;
