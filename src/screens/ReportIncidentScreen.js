import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Modal,
  Dimensions,
  Switch,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import { incidentAPI } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAFT_STORAGE_KEY = 'safesignal_incident_draft';

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

// Severity levels
const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: '#28a745', description: 'Minor incident, no immediate risk' },
  { value: 'medium', label: 'Medium', color: '#ffc107', description: 'Moderate concern, needs attention' },
  { value: 'high', label: 'High', color: '#fd7e14', description: 'Serious incident, urgent' },
  { value: 'critical', label: 'Critical', color: '#dc3545', description: 'Emergency, immediate action needed' },
];

const ReportIncidentScreen = ({ navigation, route }) => {
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date());
  const [severity, setSeverity] = useState('medium');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photos, setPhotos] = useState([]);
  
  // UI states
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState(null);
  
  // Map states
  const [mapRegion, setMapRegion] = useState(null);
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);
  
  // Form validation states
  const [errors, setErrors] = useState({});

  const mapRef = useRef(null);

  // Load draft on mount
  useEffect(() => {
    loadDraft();
  }, []);

  // Check if editing existing draft from route params
  useEffect(() => {
    if (route?.params?.draft) {
      const draft = route.params.draft;
      loadDraftData(draft);
    }
  }, [route?.params?.draft]);

  /**
   * Load saved draft from storage
   */
  const loadDraft = async () => {
    try {
      const savedDraft = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setHasDraft(true);
        
        // Ask user if they want to restore draft
        Alert.alert(
          'Draft Found',
          'You have an unsaved draft. Would you like to continue editing it?',
          [
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => clearDraft(),
            },
            {
              text: 'Continue',
              onPress: () => loadDraftData(draft),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  /**
   * Load draft data into form
   */
  const loadDraftData = (draft) => {
    setTitle(draft.title || '');
    setDescription(draft.description || '');
    setSelectedCategory(draft.category || '');
    setSeverity(draft.severity || 'medium');
    setIsAnonymous(draft.isAnonymous || false);
    setPhotos(draft.photos || []);
    
    if (draft.location) {
      setLocation(draft.location);
      setLocationName(draft.locationName || '');
    }
    
    if (draft.incidentDate) {
      setIncidentDate(new Date(draft.incidentDate));
    }
    
    if (draft.id) {
      setDraftId(draft.id);
    }
  };

  /**
   * Save current form as draft
   */
  const saveDraft = async (showAlert = true) => {
    setIsSavingDraft(true);
    
    try {
      const draftData = {
        title,
        description,
        category: selectedCategory,
        location,
        locationName,
        incidentDate: incidentDate.toISOString(),
        severity,
        isAnonymous,
        photos,
        savedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      setHasDraft(true);

      if (showAlert) {
        Alert.alert('Draft Saved', 'Your report has been saved as a draft.');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      if (showAlert) {
        Alert.alert('Error', 'Failed to save draft. Please try again.');
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  /**
   * Clear saved draft
   */
  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  /**
   * Get current location using real GPS
   */
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    setErrors({ ...errors, location: null });

    try {
      // Check permission first
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setIsLoadingLocation(false);
        Alert.alert(
          'Permission Denied',
          'Location permission is required to get your current location. Please enable it in settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current position with high accuracy
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });

      const { latitude, longitude } = position.coords;
      
      setLocation({ latitude, longitude });
      setSelectedMapLocation({ latitude, longitude });
      
      // Try to get address (reverse geocoding)
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (address) {
          const addressParts = [
            address.street,
            address.city,
            address.region,
          ].filter(Boolean);
          setLocationName(addressParts.join(', '));
        }
      } catch (geocodeError) {
        console.log('Reverse geocoding failed:', geocodeError);
      }

      // Update map region
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });

      setIsLoadingLocation(false);
      
      Alert.alert(
        'Location Set',
        `Your location has been captured.\n\nLat: ${latitude.toFixed(6)}\nLng: ${longitude.toFixed(6)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      setIsLoadingLocation(false);
      console.error('Location error:', error);
      
      let errorMessage = 'Unable to get your current location.';
      if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Location request timed out. Please try again.';
      } else if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        errorMessage = 'Please enable location services in your device settings.';
      }
      
      setErrors({ ...errors, location: errorMessage });
      Alert.alert('Location Error', errorMessage);
    }
  };

  /**
   * Open map for location selection
   */
  const openMapForSelection = async () => {
    // If we don't have a location yet, try to get current location first
    if (!location) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const { latitude, longitude } = position.coords;
          setMapRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          setSelectedMapLocation({ latitude, longitude });
        } catch (error) {
          // Use default location if GPS fails
          setMapRegion({
            latitude: 40.7128,
            longitude: -74.0060,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      }
    } else {
      setMapRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setSelectedMapLocation(location);
    }
    
    setShowMapModal(true);
  };

  /**
   * Handle map press to select location
   */
  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedMapLocation({ latitude, longitude });

    // Try to get address
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        const addressParts = [
          address.street,
          address.city,
          address.region,
        ].filter(Boolean);
        setLocationName(addressParts.join(', '));
      }
    } catch (error) {
      console.log('Reverse geocoding failed:', error);
    }
  };

  /**
   * Confirm selected map location
   */
  const confirmMapLocation = () => {
    if (selectedMapLocation) {
      setLocation(selectedMapLocation);
      setErrors({ ...errors, location: null });
    }
    setShowMapModal(false);
  };

  /**
   * Pick image from gallery
   */
  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can only attach up to 5 photos.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library permission is needed to choose photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  /**
   * Take photo with camera
   */
  const takePhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can only attach up to 5 photos.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  /**
   * Remove a photo
   */
  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  /**
   * Show photo options
   */
  const showPhotoOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  /**
   * Format date for display
   */
  const formatDate = (date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Set incident date to now
   */
  const setDateToNow = () => {
    setIncidentDate(new Date());
  };

  /**
   * Validate form inputs
   */
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (title.trim().length > 255) {
      newErrors.title = 'Title must not exceed 255 characters';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (description.trim().length > 5000) {
      newErrors.description = 'Description must not exceed 5000 characters';
    }

    if (!selectedCategory) {
      newErrors.category = 'Please select a category';
    }

    if (!location) {
      newErrors.location = 'Please set the incident location';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle incident submission
   */
  const handleSubmit = async (asDraft = false) => {
    if (!asDraft && !validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setIsSubmitting(true);

    try {
      const incidentData = {
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        latitude: location?.latitude,
        longitude: location?.longitude,
        locationName: locationName || null,
        incidentDate: incidentDate.toISOString(),
        severity,
        isAnonymous,
        isDraft: asDraft,
        photoUrls: photos, // In production, upload these to cloud storage first
      };

      let result;
      
      if (draftId) {
        // Update existing draft
        result = await incidentAPI.updateIncident(draftId, incidentData);
      } else {
        // Create new incident
        result = await incidentAPI.submitIncident(incidentData);
      }

      if (result.success) {
        // Clear the local draft on successful submission
        await clearDraft();

        Alert.alert(
          'Success',
          asDraft 
            ? 'Your draft has been saved!' 
            : 'Your incident report has been submitted successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setTitle('');
                setDescription('');
                setSelectedCategory('');
                setLocation(null);
                setLocationName('');
                setIncidentDate(new Date());
                setSeverity('medium');
                setIsAnonymous(false);
                setPhotos([]);
                setErrors({});
                setDraftId(null);
                
                navigation.navigate('Home');
              },
            },
          ]
        );
      } else {
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
        {hasDraft && (
          <View style={styles.draftBadge}>
            <Text style={styles.draftBadgeText}>Draft</Text>
          </View>
        )}
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
        {/* Anonymous Reporting Toggle */}
        <View style={styles.toggleSection}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>🕵️ Report Anonymously</Text>
            <Text style={styles.toggleDescription}>
              Your identity will be hidden from the public
            </Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: '#ddd', true: '#81b0ff' }}
            thumbColor={isAnonymous ? '#1a73e8' : '#f4f3f4'}
          />
        </View>

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

        {/* Severity Indicator */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Severity Level</Text>
          <View style={styles.severityContainer}>
            {SEVERITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.severityButton,
                  { borderColor: level.color },
                  severity === level.value && { backgroundColor: level.color },
                ]}
                onPress={() => setSeverity(level.value)}
              >
                <Text
                  style={[
                    styles.severityLabel,
                    severity === level.value && styles.severityLabelSelected,
                  ]}
                >
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.helperText}>
            {SEVERITY_LEVELS.find(l => l.value === severity)?.description}
          </Text>
        </View>

        {/* Date/Time Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>When did this happen?</Text>
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateDisplay}>
              <Text style={styles.dateIcon}>📅</Text>
              <Text style={styles.dateText}>{formatDate(incidentDate)}</Text>
            </View>
            <TouchableOpacity style={styles.setNowButton} onPress={setDateToNow}>
              <Text style={styles.setNowButtonText}>Set to Now</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Default is current time. Adjust if incident happened earlier.
          </Text>
        </View>

        {/* Location Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Location <Text style={styles.required}>*</Text>
          </Text>
          
          <View style={styles.locationButtonsContainer}>
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
                  <Text style={styles.locationButtonText}>
                    {location ? 'Update Location' : 'Use GPS'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapSelectButton}
              onPress={openMapForSelection}
            >
              <Text style={styles.locationIcon}>🗺️</Text>
              <Text style={styles.mapSelectButtonText}>Select on Map</Text>
            </TouchableOpacity>
          </View>

          {location && (
            <View style={styles.locationPreview}>
              <MapView
                style={styles.miniMap}
                region={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker coordinate={location} />
              </MapView>
              <View style={styles.locationDetails}>
                {locationName ? (
                  <Text style={styles.locationNameText}>{locationName}</Text>
                ) : null}
                <Text style={styles.coordinatesText}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          )}
          
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          <Text style={styles.helperText}>
            Your exact location will be slightly randomized for privacy
          </Text>
        </View>

        {/* Photo Upload */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Photos (Optional)</Text>
          <Text style={styles.helperText}>Add up to 5 photos to support your report</Text>
          
          <View style={styles.photosContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.photoThumbnail} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            {photos.length < 5 && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={showPhotoOptions}>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Save Draft Button */}
          <TouchableOpacity
            style={[styles.draftButton, isSavingDraft && styles.buttonDisabled]}
            onPress={() => saveDraft(true)}
            disabled={isSavingDraft}
          >
            {isSavingDraft ? (
              <ActivityIndicator color="#1a73e8" />
            ) : (
              <Text style={styles.draftButtonText}>💾 Save Draft</Text>
            )}
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Selection Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity onPress={() => setShowMapModal(false)}>
              <Text style={styles.mapModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>Select Location</Text>
            <TouchableOpacity onPress={confirmMapLocation}>
              <Text style={styles.mapModalConfirm}>Confirm</Text>
            </TouchableOpacity>
          </View>
          
          <MapView
            ref={mapRef}
            style={styles.fullMap}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            onPress={handleMapPress}
          >
            {selectedMapLocation && (
              <Marker
                coordinate={selectedMapLocation}
                draggable
                onDragEnd={(e) => handleMapPress(e)}
              />
            )}
          </MapView>
          
          <View style={styles.mapInstructions}>
            <Text style={styles.mapInstructionsText}>
              Tap on the map or drag the marker to select the incident location
            </Text>
            {selectedMapLocation && (
              <Text style={styles.selectedLocationText}>
                Selected: {selectedMapLocation.latitude.toFixed(6)}, {selectedMapLocation.longitude.toFixed(6)}
              </Text>
            )}
          </View>
        </View>
      </Modal>
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
  draftBadge: {
    position: 'absolute',
    right: 20,
    top: 55,
    backgroundColor: '#ffc107',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
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
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#666',
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
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  severityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  severityLabelSelected: {
    color: '#fff',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  dateText: {
    fontSize: 15,
    color: '#333',
  },
  setNowButton: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  setNowButtonText: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '600',
  },
  locationButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  locationButton: {
    flex: 1,
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  locationButtonActive: {
    backgroundColor: '#28a745',
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  mapSelectButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a73e8',
  },
  mapSelectButtonText: {
    color: '#1a73e8',
    fontSize: 15,
    fontWeight: '600',
  },
  locationPreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  miniMap: {
    height: 150,
    width: '100%',
  },
  locationDetails: {
    padding: 12,
  },
  locationNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc3545',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  addPhotoIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 11,
    color: '#666',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  draftButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#1a73e8',
  },
  draftButtonText: {
    color: '#1a73e8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  mapModalCancel: {
    fontSize: 16,
    color: '#666',
  },
  mapModalConfirm: {
    fontSize: 16,
    color: '#1a73e8',
    fontWeight: '600',
  },
  fullMap: {
    flex: 1,
  },
  mapInstructions: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  mapInstructionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectedLocationText: {
    fontSize: 12,
    color: '#1a73e8',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default ReportIncidentScreen;
