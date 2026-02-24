import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { incidentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import useDraftManager from '../hooks/useDraftManager';
import useImagePicker from '../hooks/useImagePicker';
import useIncidentForm from '../hooks/useIncidentForm';
import useLocationPicker from '../hooks/useLocationPicker';
import useUserPreferences from '../hooks/useUserPreferences';
import incidentConstants from '../../../constants/incident';
import { AppText, Button } from '../components';
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
  const tabBarHeight = useBottomTabBarHeight();
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

  const clearLocationError = useCallback(() => {
    setErrors((prev) => ({ ...prev, location: null }));
  }, [setErrors]);

  const setLocationError = useCallback((message) => {
    setErrors((prev) => ({ ...prev, location: message }));
  }, [setErrors]);

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
    onClearLocationError: clearLocationError,
    onLocationError: setLocationError,
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

  const getDraftPayload = useCallback(() => ({
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
  }), [
    description,
    enableMlClassification,
    enableMlRisk,
    incidentDate,
    isAnonymous,
    location,
    locationName,
    photos,
    selectedCategory,
    severity,
    title,
  ]);

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

  const handleToggleMlClassification = useCallback((value) => {
    setEnableMlClassification(value);
  }, []);

  const handleToggleMlRisk = useCallback((value) => {
    setEnableMlRisk(value);
  }, []);

  const handleTitleChange = useCallback((text) => {
    setTitle(text);
    setErrors((prev) => ({ ...prev, title: null }));
  }, [setErrors, setTitle]);

  const handleDescriptionChange = useCallback((text) => {
    setDescription(text);
    setErrors((prev) => ({ ...prev, description: null }));
  }, [setDescription, setErrors]);

  const handleCategorySelect = useCallback((value) => {
    setSelectedCategory(value);
    setErrors((prev) => ({ ...prev, category: null }));
  }, [setErrors, setSelectedCategory]);

  const handleCloseMapModal = useCallback(() => {
    setShowMapModal(false);
  }, [setShowMapModal]);

  const handleSaveDraftPress = useCallback(() => {
    saveDraft(true);
  }, [saveDraft]);

  /**
   * Handle incident submission
   */
  const handleSubmit = useCallback(async (asDraft = false) => {
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
      const draftIdValue = draftId != null ? String(draftId) : '';
      
      // For drafts stored locally (with temp ID like "draft-123"), always submit as new
      // For drafts stored in DB (with numeric ID), update if submitting with isDraft=false, otherwise submit new
      if (draftIdValue && !draftIdValue.startsWith('draft-') && !asDraft) {
        // Update existing database draft to submitted status
        result = await incidentAPI.updateIncident(draftIdValue, incidentData);
      } else {
        // Create new incident (handles both new reports and local draft submissions)
        result = await incidentAPI.submitIncident(incidentData);
      }

      if (result.success) {
        // Clear the local draft only on successful submission (not when saving as draft)
        if (!asDraft) {
          await clearDraft();

          // Reset form state immediately so returning to this screen starts clean
          resetForm();
          setLocation(null);
          setLocationName('');
          setSelectedMapLocation(null);
          setMapRegion(null);
          setPhotos([]);
          setDraftId(null);
          setEnableMlClassification(true);
          setEnableMlRisk(true);
          setIsAnonymous(!!preferences.defaultAnonymous);
        }

        setIsSubmitting(false);
        isSubmittingRef.current = false;

        Alert.alert(
          asDraft ? 'Draft saved' : 'Report submitted',
          asDraft 
            ? 'Your draft is saved. You can continue editing anytime.' 
            : 'Thanks for reporting this. We received your report and will review it shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (!asDraft) {
                  navigation.navigate('Home');
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
  }, [
    clearDraft,
    description,
    draftId,
    enableMlClassification,
    enableMlRisk,
    isAnonymous,
    isSubmitting,
    location,
    locationName,
    navigation,
    photos,
    preferences.defaultAnonymous,
    resetForm,
    selectedCategory,
    severity,
    setDraftId,
    setIsAnonymous,
    setLocation,
    setLocationName,
    setMapRegion,
    setPhotos,
    setSelectedMapLocation,
    title,
    validateForm,
    incidentDate,
  ]);

  const handleSubmitPress = useCallback(() => {
    handleSubmit(false);
  }, [handleSubmit]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}> 
        <AppText variant="h1" style={[styles.headerTitle, { color: theme.card }]}>Report Incident</AppText>
        {hasDraft && (
          <View style={[styles.draftBadge, { backgroundColor: theme.warning }]}> 
            <AppText variant="caption" style={[styles.draftBadgeText, { color: theme.warningContrastText }]}>Draft</AppText>
          </View>
        )}
      </View>

      {/* Safety Notice */}
      <View style={[
        styles.noticeContainer,
        {
          backgroundColor: theme.warningNoticeBg,
          borderColor: theme.warning,
        },
      ]}
      >
        <Ionicons name="warning-outline" size={18} color={theme.warning} style={styles.noticeIcon} />
        <AppText variant="body" style={[styles.noticeText, { color: theme.warningNoticeText }]}> 
          If you are in immediate danger, call emergency services (911) immediately.
        </AppText>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        <AnonymousToggle 
          isAnonymous={isAnonymous} 
          onToggle={setIsAnonymous} 
        />

        <IncidentTextFields
          title={title}
          onTitleChange={handleTitleChange}
          description={description}
          onDescriptionChange={handleDescriptionChange}
          errors={errors}
        />

        {showCategoryPicker && (
          <IncidentCategoryPicker
            categories={INCIDENT_CATEGORIES}
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
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
          onCloseMapModal={handleCloseMapModal}
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
            title="Save Draft"
            onPress={handleSaveDraftPress}
            loading={isSavingDraft}
            disabled={isSavingDraft}
            variant="secondary"
            style={styles.draftButton}
          />

          {/* Submit Button */}
          <Button
            title="Submit Report"
            onPress={handleSubmitPress}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              { backgroundColor: theme.primary },
              isSubmitting && styles.submitButtonDisabled,
            ]}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
  },
  draftBadge: {
    position: 'absolute',
    right: 20,
    top: 55,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  draftBadgeText: {
  },
  noticeContainer: {
    borderWidth: 1,
    padding: 15,
    margin: 20,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIcon: {
    marginRight: 10,
  },
  noticeText: {
    flex: 1,
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
    borderWidth: 0,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
});

export default ReportIncidentScreen;
