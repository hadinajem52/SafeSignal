import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, TouchableOpacity } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import ImageCropPicker from 'react-native-image-crop-picker';
import * as Location from 'expo-location';
import { AppText, ConfirmModal } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { buildCropperOptions, isCropperCancelled, toFileUri } from '../../utils/imageCropper';
import useUserPreferences from '../../hooks/useUserPreferences';
import useUserStats from '../../hooks/useUserStats';
import { getMobileNotificationStatus, sendTestNotification } from '../../services/mobileNotifications';
import { pushTokenService } from '../../services/pushTokenService';
import useLocationConsent from '../../hooks/useLocationConsent';
import ContributionsGrid from '../Home/ContributionsGrid';
import AccessStatusSection from './AccessStatusSection';
import DangerZone from './DangerZone';
import EditNameModal from './EditNameModal';
import PreferencesSection from './PreferencesSection';
import ProfileHeader from './ProfileHeader';
import SupportSection from './SupportSection';
import styles from './accountStyles';
import ThemeSection from './ThemeSection';

const getNotificationAccessStatus = (notificationPermission, pushNotificationsEnabled) => {
  if (notificationPermission.granted) {
    return {
      status: 'granted',
      detail: 'System permission is granted'
    };
  }

  const status = notificationPermission.status || 'unknown';
  if (!pushNotificationsEnabled || status === 'disabled') {
    return { status, detail: 'App notifications are disabled' };
  }

  if (status === 'unsupported') {
    return { status, detail: 'Notifications are not supported on this platform' };
  }

  if (status === 'undetermined') {
    return { status, detail: 'System notification permission has not been requested' };
  }

  if (status === 'denied') {
    return { status, detail: 'System notification permission is blocked' };
  }

  return { status, detail: 'Could not read notification permission status' };
};

const AccountScreen = () => {
  const navigation = useNavigation();
  const { logout, user } = useAuth();
  const { theme, isDark, setThemeMode } = useTheme();
  const { showToast } = useToast();
  const { preferences, updatePreference } = useUserPreferences();
  const { enableLocationSharing, disableLocationSharing } = useLocationConsent();
  const { userStats, loading: userStatsLoading, error: userStatsError } = useUserStats();
  const tabBarHeight = useBottomTabBarHeight();
  const [isEditingName, setIsEditingName] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [inlinePreferenceFeedback, setInlinePreferenceFeedback] = useState('');
  const [isSendingFcmTest, setIsSendingFcmTest] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [accessStatus, setAccessStatus] = useState({
    location: { status: 'unknown', detail: '' },
    notifications: { status: 'unknown', detail: '' },
    camera: { status: 'unknown', detail: '' },
    photos: { status: 'unknown', detail: '' }
  });

  const displayName = useMemo(() => {
    const savedName = preferences.displayName?.trim();
    return savedName || user?.username || user?.email || 'User';
  }, [preferences.displayName, user]);

  const avatarUri = preferences.avatarUri || '';
  const memberSince = user?.created_at ?
  new Date(user.created_at).toLocaleString('en-US', { month: 'long', year: 'numeric' }) :
  'January 2026';
  const initials =
  displayName.
  split(' ').
  filter(Boolean).
  slice(0, 2).
  map((part) => part[0]?.toUpperCase()).
  join('') || 'U';

  const confirmDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteAccountConfirmed = () => {
    setShowDeleteModal(false);
    const email = 'support@safesignal.org';
    const subject = encodeURIComponent('Account Deletion Request');
    const body = encodeURIComponent(
      `Please delete my SafeSignal account.\n\nUser: ${user?.email || 'Unknown'}`
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
      showToast('Unable to open mail app. Please contact support@safesignal.org directly.', 'error');
    });
  };

  const openLink = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  const contactSupport = () => {
    const email = 'support@safesignal.org';
    const subject = encodeURIComponent('SafeSignal Support Request');
    const body = encodeURIComponent('Describe your issue or question here.');
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {});
  };

  const handleAvatarPress = () => {
    setShowAvatarModal(true);
  };

  const handleChoosePhoto = async () => {
    setShowAvatarModal(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Photo library permission is needed to choose a photo.', 'warning');
        return;
      }

      const image = await ImageCropPicker.openPicker({
        ...buildCropperOptions(theme),
        width: 512,
        height: 512,
        cropperCircleOverlay: true,
        compressImageQuality: 0.8,
        cropperToolbarTitle: 'Crop photo',
      });

      updatePreference('avatarUri', toFileUri(image.path));
    } catch (error) {
      if (isCropperCancelled(error)) return;
      console.error('Error picking avatar:', error);
      showToast('Failed to update profile photo.', 'error');
    }
  };

  const openEditName = () => {
    setPendingName(displayName);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    const trimmed = pendingName.trim();
    if (!trimmed) {
      showToast('Please enter a display name.', 'warning');
      return;
    }

    updatePreference('displayName', trimmed);
    setIsEditingName(false);
  };

  const handleLocationToggle = async (value) => {
    if (!value) {
      await disableLocationSharing();
      setInlinePreferenceFeedback('Location sharing disabled');
      setTimeout(() => setInlinePreferenceFeedback(''), 1800);
      return;
    }

    const result = await enableLocationSharing();
    if (!result.success) {
      if (result.reason === 'permission_denied') {
        showToast('Location permission is needed. Enable it in system settings to turn this on.', 'warning');
      } else {
        showToast(result.error || 'Could not enable location sharing.', 'error');
      }
      return;
    }

    setInlinePreferenceFeedback('Location sharing enabled');
    setTimeout(() => setInlinePreferenceFeedback(''), 1800);
  };

  const handleNotificationsToggle = async (value) => {
    updatePreference('pushNotifications', value);
    if (!value) {
      await pushTokenService.clearDevicePushToken();
    } else if (preferences.locationServices) {
      await pushTokenService.registerDevicePushToken({ locationConsent: true });
    }
    setInlinePreferenceFeedback(value ? 'Notifications enabled' : 'Notifications disabled');
    setTimeout(() => setInlinePreferenceFeedback(''), 1800);
  };

  const handleSendTestNotification = async () => {
    if (!preferences.pushNotifications) {
      showToast('Enable Push Notifications first.', 'warning');
      return;
    }

    const success = await sendTestNotification();
    if (!success) {
      showToast('Notification permission may be denied on this device.', 'error');
    }
  };

  const handleSendFcmTestNotification = async () => {
    if (!preferences.pushNotifications) {
      showToast('Enable Push Notifications first.', 'warning');
      return;
    }

    if (!preferences.locationServices) {
      showToast('Enable Witness Location Sharing first so this device can register for FCM.', 'warning');
      return;
    }

    setIsSendingFcmTest(true);
    try {
      const registration = await pushTokenService.registerDevicePushToken({ locationConsent: true });
      if (!registration.success) {
        showToast(registration.error || 'Unable to register this device for FCM.', 'error');
        return;
      }

      const result = await pushTokenService.sendFcmTestNotification();
      if (!result.success) {
        showToast(result.error, 'error');
        return;
      }

      showToast('FCM test sent. Check this device for a notification.', 'success');
      setInlinePreferenceFeedback('FCM test notification sent');
      setTimeout(() => setInlinePreferenceFeedback(''), 1800);
    } finally {
      setIsSendingFcmTest(false);
    }
  };

  const handleSimulateWitnessPrompt = () => {



    navigation.navigate('WitnessPrompt', { simulation: true });
  };

  const refreshAccessStatus = useCallback(async () => {
    try {
      const [locationPermission, cameraPermission, mediaPermission] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync()]
      );

      const notificationPermission = await getMobileNotificationStatus();
      const notificationsAccess = getNotificationAccessStatus(
        notificationPermission,
        preferences.pushNotifications
      );

      setAccessStatus({
        location: {
          status: locationPermission.status || 'unknown',
          detail:
          locationPermission.status === 'granted' ?
          'Nearby safety scoring is available' :
          'Required for nearby safety score and map context'
        },
        notifications: {
          status: notificationsAccess.status,
          detail: notificationsAccess.detail
        },
        camera: {
          status: cameraPermission.status || 'unknown',
          detail:
          cameraPermission.status === 'granted' ?
          'Camera can be used for incident photos' :
          'Required to capture incident photos'
        },
        photos: {
          status: mediaPermission.status || 'unknown',
          detail:
          mediaPermission.status === 'granted' ?
          'Photo library access is available' :
          'Required to attach photos from your library'
        }
      });
    } catch {
      setAccessStatus({
        location: { status: 'unknown', detail: 'Could not read location permission status' },
        notifications: { status: 'unknown', detail: 'Could not read notification permission status' },
        camera: { status: 'unknown', detail: 'Could not read camera permission status' },
        photos: { status: 'unknown', detail: 'Could not read media permission status' }
      });
    }
  }, [preferences.pushNotifications]);

  useFocusEffect(
    useCallback(() => {
      refreshAccessStatus();
    }, [refreshAccessStatus])
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight + 8 }]}
      showsVerticalScrollIndicator={false}>

      <AppText variant="h1" style={[styles.title, { color: theme.text }]}>Account</AppText>

      <ProfileHeader
        avatarUri={avatarUri}
        initials={initials}
        displayName={displayName}
        memberSince={memberSince}
        email={user?.email || 'User'}
        onAvatarPress={handleAvatarPress}
        onEditNamePress={openEditName} />


      {userStatsLoading ?
      <ActivityIndicator color={theme.primary} style={{ marginBottom: 16 }} /> :
      userStatsError ?
      <AppText variant="bodySmall" style={{ color: theme.error, marginBottom: 16 }}>
          {userStatsError}
        </AppText> :

      <ContributionsGrid userStats={userStats} />
      }

      <ThemeSection
        isDark={isDark}
        onThemeToggle={(value) => setThemeMode(value ? 'dark' : 'light')} />


      <PreferencesSection
        preferences={preferences}
        onLocationToggle={handleLocationToggle}
        onNotificationsToggle={handleNotificationsToggle}
        onDefaultAnonymousToggle={(value) => updatePreference('defaultAnonymous', value)}
        onFeedAutoplayToggle={(value) => updatePreference('feedVideoAutoplay', value)}
        onSendTestNotification={handleSendTestNotification}
        onSendFcmTestNotification={handleSendFcmTestNotification}
        onSimulateWitnessPrompt={handleSimulateWitnessPrompt}
        isSendingFcmTest={isSendingFcmTest}
        feedbackMessage={inlinePreferenceFeedback} />


      <AccessStatusSection accessStatus={accessStatus} onOpenSettings={() => Linking.openSettings?.()} />

      <TouchableOpacity
        style={[styles.moreToggle, { borderColor: theme.border, backgroundColor: theme.card }]}
        onPress={() => setShowMore((prev) => !prev)}>

        <AppText variant="label" style={{ color: theme.text }}>More settings</AppText>
        <Ionicons name={showMore ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
      </TouchableOpacity>

      {showMore ?
      <>
          <SupportSection
          onHelp={() => openLink('https://safesignal.org/help')}
          onTerms={() => openLink('https://safesignal.org/terms')}
          onPrivacy={() => openLink('https://safesignal.org/privacy')}
          onContactSupport={contactSupport} />


          <DangerZone onLogout={logout} onDeleteAccount={confirmDeleteAccount} />
        </> :
      null}

      <EditNameModal
        visible={isEditingName}
        pendingName={pendingName}
        onChangeName={setPendingName}
        onCancel={() => setIsEditingName(false)}
        onSave={handleSaveName} />
      <ConfirmModal
        visible={showAvatarModal}
        title="Profile Photo"
        message="Update your profile photo"
        actions={[
        { text: 'Choose Photo', onPress: handleChoosePhoto },
        {
          text: 'Remove Photo',
          style: 'destructive',
          onPress: () => {setShowAvatarModal(false);updatePreference('avatarUri', '');}
        },
        { text: 'Cancel', style: 'cancel', onPress: () => setShowAvatarModal(false) }]
        }
        onRequestClose={() => setShowAvatarModal(false)} />
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Account"
        message="This action is permanent and cannot be undone. Do you want to continue?"
        actions={[
        { text: 'Cancel', style: 'cancel', onPress: () => setShowDeleteModal(false) },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteAccountConfirmed }]
        }
        onRequestClose={() => setShowDeleteModal(false)} />

    </ScrollView>);

};

export default AccountScreen;