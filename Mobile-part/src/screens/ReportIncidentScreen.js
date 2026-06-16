import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { incidentAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import useDraftManager from "../hooks/useDraftManager";
import useImagePicker from "../hooks/useImagePicker";
import useIncidentForm from "../hooks/useIncidentForm";
import useLocationPicker from "../hooks/useLocationPicker";
import useUserPreferences from "../hooks/useUserPreferences";
import incidentConstants from "../../../constants/incident";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText, Button, ConfirmModal, IncidentIllustration } from "../components";
import haptics from "../utils/haptics";
import { callEmergency, EMERGENCY_NUMBER } from "../utils/emergency";
import { DURATION } from "../theme/motion";
import {
  IncidentCategoryPicker,
  IncidentSeverityPicker,
  IncidentDateTimePicker,
  IncidentLocationPicker,
  IncidentPhotoUploader,
  IncidentTextFields,
  AnonymousToggle,
  MlFeatureToggles } from
"../components/IncidentForm";
import styles from "./reportIncidentStyles";

const { INCIDENT_CATEGORIES, SEVERITY_LEVELS } = incidentConstants;

const createIncidentIdempotencyKey = () =>
`incident_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

const ReportIncidentScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const tabBarHeight = useBottomTabBarHeight();
  const userId = user?.user_id || user?.userId;
  const { preferences, isLoading: isLoadingPreferences } = useUserPreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState("");
  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef(createIncidentIdempotencyKey());
  const successNavigationTimerRef = useRef(null);
  const hasAppliedDefaultAnonymous = useRef(false);
  const [enableMlClassification, setEnableMlClassification] = useState(true);
  const [enableMlRisk, setEnableMlRisk] = useState(true);
  const showCategoryPicker = !enableMlClassification;
  const showSeverityPicker = !enableMlRisk;


  const {
    title,
    setTitle,
    description,
    setDescription,
    selectedCategory,
    setSelectedCategory,
    incidentDate,
    setIncidentDate,
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
    applyDraftForm
  } = useIncidentForm();

  const clearLocationError = useCallback(() => {
    setErrors((prev) => ({ ...prev, location: null }));
  }, [setErrors]);

  const setLocationError = useCallback(
    (message) => {
      setErrors((prev) => ({ ...prev, location: message }));
    },
    [setErrors]
  );


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
    applyDraftLocation
  } = useLocationPicker({
    onClearLocationError: clearLocationError,
    onLocationError: setLocationError,
    locationServicesEnabled: preferences.locationServices
  });


  const {
    photos,
    setPhotos,
    video,
    setVideo,
    isVideoProcessing,
    videoProcessingProgress,
    removePhoto,
    removeVideo,
    pickImage,
    takePhoto,
    pickVideo,
    recordVideo
  } = useImagePicker();


  const applyDraft = (draft) => {
    applyDraftForm(draft);
    applyDraftLocation(draft);
    setPhotos(draft?.photos || []);
    setVideo(draft?.video || null);
    setEnableMlClassification(draft?.enableMlClassification ?? true);
    setEnableMlRisk(draft?.enableMlRisk ?? true);
    idempotencyKeyRef.current = draft?.idempotencyKey || createIncidentIdempotencyKey();
    if (draft?.id) {
      setDraftId(draft.id);
    }
    hasAppliedDefaultAnonymous.current = true;
  };

  const getDraftPayload = useCallback(
    () => ({
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
      video,
      idempotencyKey: idempotencyKeyRef.current
    }),
    [
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
    video]

  );

  const {
    hasDraft,
    isSavingDraft,
    draftId,
    setDraftId,
    pendingDraft,
    confirmDraft,
    discardDraft,
    loadDraft,
    saveDraft,
    clearDraft
  } = useDraftManager({ userId, onLoadDraft: applyDraft, getDraftPayload });


  useEffect(() => {
    loadDraft();
    return () => {
      isSubmittingRef.current = false;
      if (successNavigationTimerRef.current) {
        clearTimeout(successNavigationTimerRef.current);
      }
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
  }, [
  isLoadingPreferences,
  preferences.defaultAnonymous,
  route?.params?.draft,
  setIsAnonymous]
  );

  useEffect(() => {
    if (enableMlClassification && !selectedCategory) {
      setSelectedCategory("other");
    }

    if (enableMlClassification) {
      setErrors((prev) => ({ ...prev, category: null }));
    }
  }, [
  enableMlClassification,
  selectedCategory,
  setErrors,
  setSelectedCategory]
  );

  const handleToggleMlClassification = useCallback((value) => {
    setEnableMlClassification(value);
  }, []);

  const handleToggleMlRisk = useCallback((value) => {
    setEnableMlRisk(value);
  }, []);

  const handleTitleChange = useCallback(
    (text) => {
      setTitle(text);
      setErrors((prev) => ({ ...prev, title: null }));
    },
    [setErrors, setTitle]
  );

  const handleDescriptionChange = useCallback(
    (text) => {
      setDescription(text);
      setErrors((prev) => ({ ...prev, description: null }));
    },
    [setDescription, setErrors]
  );

  const handleCategorySelect = useCallback(
    (value) => {
      setSelectedCategory(value);
      setErrors((prev) => ({ ...prev, category: null }));
    },
    [setErrors, setSelectedCategory]
  );

  const handleCloseMapModal = useCallback(() => {
    setShowMapModal(false);
  }, [setShowMapModal]);

  const handleSaveDraftPress = useCallback(() => {
    saveDraft(true);
  }, [saveDraft]);

  const handleDiscardDraft = useCallback(() => {
    discardDraft();
    idempotencyKeyRef.current = createIncidentIdempotencyKey();
  }, [discardDraft]);




  const handleSubmit = useCallback(
    async (asDraft = false) => {

      if (isSubmittingRef.current) {
        return;
      }

      if (isVideoProcessing) {
        showToast('Please wait while the video is prepared for upload.', 'warning');
        return;
      }

      if (!asDraft && !validateForm(location)) {

        showToast('Please fill in all required fields correctly.', 'warning');
        return;
      }


      if (isSubmitting) {
        return;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {

        if (!asDraft && !location) {
          showToast('Please set a location for your incident report.', 'warning');
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
          photoUrls: photos,
          video,
          idempotencyKey: asDraft ? undefined : idempotencyKeyRef.current
        };

        let result;
        const draftIdValue = draftId != null ? String(draftId) : "";



        if (draftIdValue && !draftIdValue.startsWith("draft-") && !asDraft) {

          result = await incidentAPI.updateIncident(draftIdValue, incidentData);
        } else {

          result = await incidentAPI.submitIncident(incidentData);
        }

        if (result.success) {

          if (!asDraft) {
            await clearDraft();


            resetForm();
            setLocation(null);
            setLocationName("");
            setSelectedMapLocation(null);
            setMapRegion(null);
            setPhotos([]);
            setVideo(null);
            setDraftId(null);
            setEnableMlClassification(true);
            setEnableMlRisk(true);
            setIsAnonymous(!!preferences.defaultAnonymous);
            idempotencyKeyRef.current = createIncidentIdempotencyKey();
            const successMessage = "Report submitted. Thanks for reporting this.";
            setSubmitSuccessMessage(successMessage);
            haptics.success();
            showToast(successMessage, 'success');

            if (successNavigationTimerRef.current) {
              clearTimeout(successNavigationTimerRef.current);
            }

            successNavigationTimerRef.current = setTimeout(() => {
              setSubmitSuccessMessage("");
              navigation.navigate("Dashboard", { screen: "Home" });
            }, 1800);
          } else {
            haptics.light();
            showToast('Draft saved. You can continue editing anytime.', 'success');
          }
        } else {
          haptics.error();
          if (
          result.validationErrors &&
          Array.isArray(result.validationErrors))
          {

            const errorMessages = result.validationErrors.map((err) => {
              if (typeof err === "string") {
                return err;
              }

              return err.msg || JSON.stringify(err);
            });
            showToast(errorMessages.join(' · '), 'error');
          } else {
            showToast(result.error || 'Failed to submit incident', 'error');
          }
        }
      } catch (error) {
        haptics.error();
        showToast('An unexpected error occurred. Please try again.', 'error');
        console.error("Submit incident error:", error);
      } finally {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    },
    [
    clearDraft,
    description,
    draftId,
    enableMlClassification,
    enableMlRisk,
    isAnonymous,
    isSubmitting,
    isVideoProcessing,
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
    setVideo,
    title,
    validateForm,
    incidentDate,
    showToast,
    video]

  );

  const handleSubmitPress = useCallback(() => {
    handleSubmit(false);
  }, [handleSubmit]);

  const handleEmergencyCall = useCallback(() => {
    callEmergency({ onError: (message) => showToast(message, "error") });
  }, [showToast]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: tabBarHeight + 8 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <AppText variant="h1" style={{ color: theme.card }}>
          Report Incident
        </AppText>
        {hasDraft && (
          <View style={[styles.draftBadge, { backgroundColor: theme.warning }]}>
            <AppText
              variant="caption"
              style={{ color: theme.warningContrastText }}
            >
              Draft
            </AppText>
          </View>
        )}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Call emergency services (${EMERGENCY_NUMBER})`}
        activeOpacity={0.85}
        onPress={handleEmergencyCall}
        style={[
          styles.noticeContainer,
          {
            backgroundColor: theme.warningNoticeBg,
            borderColor: theme.warning,
          },
        ]}
      >
        <Ionicons
          name="warning-outline"
          size={18}
          color={theme.warning}
          style={styles.noticeIcon}
        />
        <AppText
          variant="body"
          style={[styles.noticeText, { color: theme.warningNoticeText }]}
        >
          In immediate danger? Tap to call emergency services ({EMERGENCY_NUMBER}).
        </AppText>
        <View style={[styles.noticeCallPill, { backgroundColor: theme.error }]}>
          <Ionicons name="call" size={14} color="#FFFFFF" />
          <AppText variant="buttonSmall" style={styles.noticeCallPillText}>
            Call
          </AppText>
        </View>
      </TouchableOpacity>
      <View style={styles.formContainer}>
        {!!submitSuccessMessage && (
          <View
            style={[
              styles.submitSuccessBanner,
              {
                borderColor: `${theme.success}40`,
                backgroundColor: `${theme.success}14`,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={16} color={theme.success} />
            <AppText
              variant="caption"
              style={[styles.submitSuccessText, { color: theme.success }]}
            >
              {submitSuccessMessage}
            </AppText>
          </View>
        )}

        <AnonymousToggle isAnonymous={isAnonymous} onToggle={setIsAnonymous} />

        <IncidentTextFields
          title={title}
          onTitleChange={handleTitleChange}
          description={description}
          onDescriptionChange={handleDescriptionChange}
          errors={errors} />


        {showCategoryPicker && (
          <IncidentCategoryPicker
            categories={INCIDENT_CATEGORIES}
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
            error={errors.category}
          />
        )}

        {showCategoryPicker && selectedCategory ? (
          <Animated.View
            key={selectedCategory}
            entering={FadeInDown.duration(DURATION.base)}
            style={{ alignItems: 'center', marginTop: -8, marginBottom: 20 }}
          >
            <IncidentIllustration category={selectedCategory} size={130} />
          </Animated.View>
        ) : null}

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
          onToggleRisk={handleToggleMlRisk} />
        <IncidentDateTimePicker
          incidentDate={incidentDate}
          formatDate={formatDate}
          onSetToNow={setDateToNow}
          onDateChange={setIncidentDate} />
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
          mapRef={mapRef} />
        <IncidentPhotoUploader
          photos={photos}
          video={video}
          isVideoProcessing={isVideoProcessing}
          videoProcessingProgress={videoProcessingProgress}
          onTakePhoto={takePhoto}
          onPickImage={pickImage}
          onRemovePhoto={removePhoto}
          onRecordVideo={recordVideo}
          onPickVideo={pickVideo}
          onRemoveVideo={removeVideo} />
        <ConfirmModal
          visible={!!pendingDraft}
          title="Unsaved Draft"
          message="You have an unsaved draft. Would you like to continue editing it?"
          actions={[
            { text: 'Discard', style: 'destructive', onPress: handleDiscardDraft },
            { text: 'Continue', onPress: confirmDraft },
          ]}
          onRequestClose={handleDiscardDraft} />
        <View
          style={[
            styles.privacyNote,
            { borderColor: theme.border, backgroundColor: theme.surface },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={14}
            color={theme.textSecondary}
            style={styles.privacyNoteIcon}
          />
          <AppText
            variant="caption"
            style={[styles.privacyNoteText, { color: theme.textSecondary }]}
          >
            {isAnonymous
              ? "Reporting anonymously — your name won't be shown publicly. "
              : "Posting with your account name. "}
            Your exact location is randomized before it's shared.
          </AppText>
        </View>

        <View style={styles.actionButtonsContainer}>
          <Button
            title="Save Draft"
            onPress={handleSaveDraftPress}
            loading={isSavingDraft}
            disabled={isSavingDraft || isVideoProcessing}
            variant="secondary"
            style={styles.draftButton} />
          <Button
            title="Submit Report"
            onPress={handleSubmitPress}
            loading={isSubmitting || isVideoProcessing}
            disabled={isSubmitting || isVideoProcessing}
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

export default ReportIncidentScreen;
