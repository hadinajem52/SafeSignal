import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { incidentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import useDraftManager from '../hooks/useDraftManager';
import useImagePicker from '../hooks/useImagePicker';
import useIncidentForm from '../hooks/useIncidentForm';
import useLocationPicker from '../hooks/useLocationPicker';
import useUserPreferences from '../hooks/useUserPreferences';
import incidentConstants from '../../../constants/incident';
import { Button } from '../components';
import {
  IncidentCategoryPicker,
  IncidentSeverityPicker,
  IncidentDateTimePicker,
  IncidentLocationPicker,
  IncidentPhotoUploader,
  IncidentTextFields,
  AnonymousToggle,
  MlFeatureToggles,
} from '../components/IncidentForm';

const { INCIDENT_CATEGORIES, SEVERITY_LEVELS } = incidentConstants;

const ReportIncidentScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const userId = user?.user_id || user?.userId;
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const hasAppliedDefaultAnonymous = useRef(false);
  const [enableMlClassification, setEnableMlClassification] = useState(true);
  const [enableMlRisk, setEnableMlRisk] = useState(true);
  const showCategoryPicker = !enableMlClassification;
  const showSeverityPicker = !enableMlRisk;

  // Form State Hook
  const {
    title,
    setTitle,
    description,
    setDescription,
    selectedCategory,
    setSelectedCategory,
    incidentDate,
    severity,
    setSeverity,
    isAnonymous,
    setIsAnonymous,
    errors,
    setErrors,
    formatDate,
    setDateToNow,
    validateForm,
    resetForm,
    applyDraftForm,
  } = useIncidentForm();

  // Location Hook
  const {
    location,
    setLocation,
    locationName,
    setLocationName,
    isLoadingLocation,
    showMapModal,
    setShowMapModal,
    mapRegion,
    setMapRegion,
    selectedMapLocation,
    setSelectedMapLocation,
    mapRef,
    getCurrentLocation,
    openMapForSelection,
    handleMapPress,
    confirmMapLocation,
    applyDraftLocation,
  } = useLocationPicker({
    onClearLocationError: () => setErrors((prev) => ({ ...prev, location: null })),
    onLocationError: (message) => setErrors((prev) => ({ ...prev, location: message })),
    locationServicesEnabled: preferences.locationServices,
  });

  // Image Picker Hook
  const { photos, setPhotos, removePhoto, showPhotoOptions } = useImagePicker();

  // Draft Management Logic
  const applyDraft = (draft) => {
    applyDraftForm(draft);
    applyDraftLocation(draft);
    setPhotos(draft?.photos || []);
    setEnableMlClassification(draft?.enableMlClassification ?? true);
    setEnableMlRisk(draft?.enableMlRisk ?? true);
    if (draft?.id) {
      setDraftId(draft.id);
    }
    hasAppliedDefaultAnonymous.current = true;
  };

  const getDraftPayload = () => ({
    title,
    description,
    category: selectedCategory,
    location,
    locationName,
    incidentDate: incidentDate.toISOString(),
    severity,
    isAnonymous,
    enableMlClassification,
    enableMlRisk,
    photos,
  });

  const {
    hasDraft,
    isSavingDraft,
    draftId,
    setDraftId,
    loadDraft,
    saveDraft,
    clearDraft,
  } = useDraftManager({ userId, onLoadDraft: applyDraft, getDraftPayload });

  // Effects
  useEffect(() => {
    loadDraft();
    return () => {
      isSubmittingRef.current = false;
    };
  }, [loadDraft]);

  useEffect(() => {
    if (route?.params?.draft) {
      applyDraft(route.params.draft);
    }
  }, [route?.params?.draft]);

  useEffect(() => {
    if (hasAppliedDefaultAnonymous.current) {
      return;
    }

    if (isLoadingPreferences) {
      return;
    }

    if (route?.params?.draft) {
      hasAppliedDefaultAnonymous.current = true;
      return;
    }

    setIsAnonymous(!!preferences.defaultAnonymous);
    hasAppliedDefaultAnonymous.current = true;
  }, [isLoadingPreferences, preferences.defaultAnonymous, route?.params?.draft, setIsAnonymous]);

  useEffect(() => {
    if (enableMlClassification && !selectedCategory) {
      setSelectedCategory('other');
    }

    if (enableMlClassification) {
      setErrors((prev) => ({ ...prev, category: null }));
    }
  }, [enableMlClassification, selectedCategory, setErrors, setSelectedCategory]);

  const handleToggleMlClassification = (value) => {
    setEnableMlClassification(value);
  };

  const handleToggleMlRisk = (value) => {
    setEnableMlRisk(value);
  };

  /**
   * Handle incident submission
   */
  const handleSubmit = async (asDraft = false) => {
    // Use ref to prevent race conditions from rapid clicks
    if (isSubmittingRef.current) {
      return;
    }

    if (!asDraft && !validateForm(location)) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Validate location is set for non-draft submissions
      if (!asDraft && !location) {
        Alert.alert('Error', 'Please set a location for your incident report.');
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        return;
      }

      const incidentData = {
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        locationName: locationName || null,
        incidentDate: incidentDate.toISOString(),
        severity,
        isAnonymous,
        enableMlClassification,
        enableMlRisk,
        isDraft: asDraft,
        photoUrls: photos, // In production, upload these to cloud storage first
      };

      let result;
      
      // For drafts stored locally (with temp ID like "draft-123"), always submit as new
      // For drafts stored in DB (with numeric ID), update if submitting with isDraft=false, otherwise submit new
      if (draftId && !draftId.startsWith('draft-') && !asDraft) {
        // Update existing database draft to submitted status
        result = await incidentAPI.updateIncident(draftId, incidentData);
      } else {
        // Create new incident (handles both new reports and local draft submissions)
        result = await incidentAPI.submitIncident(incidentData);
      }

      if (result.success) {
        // Clear the local draft only on successful submission (not when saving as draft)
        if (!asDraft) {
          await clearDraft();
        }

        Alert.alert(
          'Success',
          asDraft 
            ? 'Your draft has been saved!' 
            : 'Your incident report has been submitted successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form only when fully submitted, not when saving draft
                if (!asDraft) {
                  resetForm();
                  setLocation(null);
                  setLocationName('');
                  setSelectedMapLocation(null);
                  setMapRegion(null);
                  setPhotos([]);
                  setDraftId(null);
                  
                  navigation.navigate('Home');
                } else {
                  // When saving as draft, just close the alert
                  setIsSubmitting(false);
                  isSubmittingRef.current = false;
                }
              },
            },
          ]
        );
      } else {
        if (result.validationErrors && Array.isArray(result.validationErrors)) {
          // Extract error messages from validation error objects
          const errorMessages = result.validationErrors.map(err => {
            if (typeof err === 'string') {
              return err;
            }
            // Handle express-validator error objects { param, msg, value }
            return err.msg || JSON.stringify(err);
          });
          Alert.alert('Validation Error', errorMessages.join('\n'));
        } else {
          Alert.alert('Error', result.error || 'Failed to submit incident');
        }
        // Re-enable button on error
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Submit incident error:', error);
      // Re-enable button on error
      setIsSubmitting(false);
      isSubmittingRef.current = false;
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
        <AnonymousToggle 
          isAnonymous={isAnonymous} 
          onToggle={setIsAnonymous} 
        />

        <IncidentTextFields
          title={title}
          onTitleChange={(text) => {
            setTitle(text);
            setErrors({ ...errors, title: null });
          }}
          description={description}
          onDescriptionChange={(text) => {
            setDescription(text);
            setErrors({ ...errors, description: null });
          }}
          errors={errors}
        />

        {showCategoryPicker && (
          <IncidentCategoryPicker
            categories={INCIDENT_CATEGORIES}
            selectedCategory={selectedCategory}
            onSelect={(value) => {
              setSelectedCategory(value);
              setErrors({ ...errors, category: null });
            }}
            error={errors.category}
          />
        )}

        {showSeverityPicker && (
          <IncidentSeverityPicker
            levels={SEVERITY_LEVELS}
            severity={severity}
            onSelect={setSeverity}
          />
        )}

        <MlFeatureToggles
          enableClassification={enableMlClassification}
          onToggleClassification={handleToggleMlClassification}
          enableRisk={enableMlRisk}
          onToggleRisk={handleToggleMlRisk}
        />

        <IncidentDateTimePicker
          incidentDate={incidentDate}
          formatDate={formatDate}
          onSetToNow={setDateToNow}
        />

        <IncidentLocationPicker
          location={location}
          locationName={locationName}
          isLoadingLocation={isLoadingLocation}
          onGetCurrentLocation={getCurrentLocation}
          onOpenMap={openMapForSelection}
          error={errors.location}
          showMapModal={showMapModal}
          onCloseMapModal={() => setShowMapModal(false)}
          onConfirmMapLocation={confirmMapLocation}
          mapRegion={mapRegion}
          onMapRegionChange={setMapRegion}
          selectedMapLocation={selectedMapLocation}
          onMapPress={handleMapPress}
          mapRef={mapRef}
        />

        <IncidentPhotoUploader
          photos={photos}
          onAddPhoto={showPhotoOptions}
          onRemovePhoto={removePhoto}
        />

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* Save Draft Button */}
          <Button
            title="💾 Save Draft"
            onPress={() => saveDraft(true)}
            loading={isSavingDraft}
            disabled={isSavingDraft}
            variant="secondary"
            style={styles.draftButton}
          />

          {/* Submit Button */}
          <Button
            title="Submit Report"
            onPress={() => handleSubmit(false)}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          />
        </View>
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
  actionButtonsContainer: {
    marginTop: 20,
    gap: 12,
  },
  draftButton: {
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#1a73e8',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
});

export default ReportIncidentScreen;
