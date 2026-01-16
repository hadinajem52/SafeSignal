import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { incidentAPI } from '../services/api';

// Incident categories matching backend validation
const CATEGORIES = [
  { value: 'theft', label: 'Theft', icon: '💰' },
  { value: 'assault', label: 'Assault', icon: '⚠️' },
  { value: 'vandalism', label: 'Vandalism', icon: '🔨' },
  { value: 'burglary', label: 'Burglary', icon: '🏠' },
  { value: 'harassment', label: 'Harassment', icon: '😠' },
  { value: 'suspicious_activity', label: 'Suspicious Activity', icon: '👀' },
  { value: 'traffic_incident', label: 'Traffic Incident', icon: '🚗' },
  { value: 'public_disturbance', label: 'Public Disturbance', icon: '📢' },
  { value: 'other', label: 'Other', icon: '📝' },
];

const ReportIncidentScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [location, setLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form validation states
  const [errors, setErrors] = useState({});

  /**
   * Get current location using device GPS
   */
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    setErrors({ ...errors, location: null });

    try {
      // Request location permissions
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // For Expo, we'll use expo-location when available
        // For now, using a mock location for testing
        // TODO: Install expo-location and implement proper GPS
        
        // Simulated location (replace with actual GPS)
        setTimeout(() => {
          const mockLocation = {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
          };
          setLocation(mockLocation);
          setIsLoadingLocation(false);
          Alert.alert(
            'Location Set',
            `Lat: ${mockLocation.latitude.toFixed(4)}, Lng: ${mockLocation.longitude.toFixed(4)}`,
            [{ text: 'OK' }]
          );
        }, 1000);
      }
    } catch (error) {
      setIsLoadingLocation(false);
      setErrors({ ...errors, location: 'Failed to get location' });
      Alert.alert('Location Error', 'Unable to get your current location. Please try again.');
    }
  };

  /**
   * Validate form inputs
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate title
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (title.trim().length > 255) {
      newErrors.title = 'Title must not exceed 255 characters';
    }

    // Validate description
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (description.trim().length > 5000) {
      newErrors.description = 'Description must not exceed 5000 characters';
    }

    // Validate category
    if (!selectedCategory) {
      newErrors.category = 'Please select a category';
    }

    // Validate location
    if (!location) {
      newErrors.location = 'Please set your location';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle incident submission
   */
  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setIsSubmitting(true);

    try {
      const incidentData = {
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        latitude: location.latitude,
        longitude: location.longitude,
      };

      const result = await incidentAPI.submitIncident(incidentData);

      if (result.success) {
        Alert.alert(
          'Success',
          'Your incident report has been submitted successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setTitle('');
                setDescription('');
                setSelectedCategory('');
                setLocation(null);
                setErrors({});
                
                // Navigate back or to My Reports
                navigation.navigate('Home');
              },
            },
          ]
        );
      } else {
        // Handle validation errors from backend
        if (result.validationErrors && Array.isArray(result.validationErrors)) {
          Alert.alert('Validation Error', result.validationErrors.join('\n'));
        } else {
          Alert.alert('Error', result.error || 'Failed to submit incident');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Submit incident error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Incident</Text>
      </View>

      {/* Safety Notice */}
      <View style={styles.noticeContainer}>
        <Text style={styles.noticeIcon}>⚠️</Text>
        <Text style={styles.noticeText}>
          If you are in immediate danger, call emergency services (911) immediately.
        </Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="Brief summary of the incident"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              setErrors({ ...errors, title: null });
            }}
            maxLength={255}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          <Text style={styles.charCount}>{title.length}/255</Text>
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            placeholder="Provide detailed information about what happened, when, and any other relevant details..."
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setErrors({ ...errors, description: null });
            }}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={5000}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          <Text style={styles.charCount}>{description.length}/5000</Text>
        </View>

        {/* Category Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.value && styles.categoryButtonSelected,
                ]}
                onPress={() => {
                  setSelectedCategory(category.value);
                  setErrors({ ...errors, category: null });
                }}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    selectedCategory === category.value && styles.categoryLabelSelected,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>

        {/* Location Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Location <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.locationButton, location && styles.locationButtonActive]}
            onPress={getCurrentLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.locationIcon}>📍</Text>
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationButtonText}>
                    {location ? 'Location Set' : 'Use Current Location'}
                  </Text>
                  {location && (
                    <Text style={styles.locationCoordinates}>
                      {`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                    </Text>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          <Text style={styles.helperText}>
            Your exact location will be slightly randomized for privacy
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#1a73e8',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  noticeContainer: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 15,
    margin: 20,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  noticeText: {
    flex: 1,
    color: '#856404',
    fontSize: 14,
    lineHeight: 20,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  categoryButton: {
    width: '31%',
    margin: '1%',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  categoryButtonSelected: {
    borderColor: '#1a73e8',
    backgroundColor: '#e8f4fd',
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryLabelSelected: {
    color: '#1a73e8',
    fontWeight: '700',
  },
  locationButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonActive: {
    backgroundColor: '#28a745',
  },
  locationIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  locationCoordinates: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
  submitButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ReportIncidentScreen;
