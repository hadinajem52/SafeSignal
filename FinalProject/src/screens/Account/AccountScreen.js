import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { AppText } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useUserPreferences from '../../hooks/useUserPreferences';
import { sendTestNotification } from '../../services/mobileNotifications';
import AccessStatusSection from './AccessStatusSection';
import DangerZone from './DangerZone';
import EditNameModal from './EditNameModal';
import PreferencesSection from './PreferencesSection';
import ProfileHeader from './ProfileHeader';
import SupportSection from './SupportSection';
import styles from './accountStyles';
import ThemeSection from './ThemeSection';

const AccountScreen = () => {
  const { logout, user } = useAuth();
  const { theme, isDark, mode, setThemeMode } = useTheme();
  const { preferences, updatePreference } = useUserPreferences();
  const [isEditingName, setIsEditingName] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [inlinePreferenceFeedback, setInlinePreferenceFeedback] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [accessStatus, setAccessStatus] = useState({
    location: { status: 'unknown', detail: '' },
    notifications: { status: 'unknown', detail: '' },
    camera: { status: 'unknown', detail: '' },
    photos: { status: 'unknown', detail: '' },
  });

  const displayName = useMemo(() => {
    const savedName = preferences.displayName?.trim();
    return savedName || user?.username || user?.email || 'User';
  }, [preferences.displayName, user]);

  const avatarUri = preferences.avatarUri || '';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : 'January 2026';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const email = 'support@safesignal.org';
            const subject = encodeURIComponent('Account Deletion Request');
            const body = encodeURIComponent(
              `Please delete my SafeSignal account.\n\nUser: ${user?.email || 'Unknown'}`
            );
            Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
              Alert.alert('Error', 'Unable to open mail app. Please contact support.');
            });
          },
        },
      ]
    );
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
    Alert.alert('Profile Photo', 'Update your profile photo', [
      {
        text: 'Choose Photo',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(
                'Permission Required',
                'Photo library permission is needed to choose a photo.'
              );
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              updatePreference('avatarUri', result.assets[0].uri);
            }
          } catch (error) {
            console.error('Error picking avatar:', error);
            Alert.alert('Error', 'Failed to update profile photo.');
          }
        },
      },
      {
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => updatePreference('avatarUri', ''),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openEditName = () => {
    setPendingName(displayName);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    const trimmed = pendingName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Please enter a display name.');
      return;
    }

    updatePreference('displayName', trimmed);
    setIsEditingName(false);
  };

  const handleLocationToggle = (value) => {
    updatePreference('locationServices', value);
    setInlinePreferenceFeedback(value ? 'Location sharing enabled' : 'Location sharing disabled');
    setTimeout(() => setInlinePreferenceFeedback(''), 1800);
  };

  const handleNotificationsToggle = (value) => {
    updatePreference('pushNotifications', value);
    setInlinePreferenceFeedback(value ? 'Notifications enabled' : 'Notifications disabled');
    setTimeout(() => setInlinePreferenceFeedback(''), 1800);
  };

  const handleSendTestNotification = async () => {
    if (!preferences.pushNotifications) {
      Alert.alert('Notifications Disabled', 'Enable Push Notifications first.');
      return;
    }

    const success = await sendTestNotification();
    if (!success) {
      Alert.alert('Notification Failed', 'Notification permission may be denied on this device.');
    }
  };

  const refreshAccessStatus = useCallback(async () => {
    try {
      const [locationPermission, cameraPermission, mediaPermission] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        ImagePicker.getCameraPermissionsAsync(),
        ImagePicker.getMediaLibraryPermissionsAsync(),
      ]);

      let notificationsStatus = 'unknown';
      let notificationsDetail = preferences.pushNotifications
        ? 'App notifications are enabled'
        : 'App notifications are disabled';

      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        notificationsStatus = granted ? 'granted' : 'denied';
        notificationsDetail = granted
          ? 'System permission is granted'
          : 'System notification permission is blocked';
      } else {
        notificationsStatus = preferences.pushNotifications ? 'enabled' : 'disabled';
      }

      setAccessStatus({
        location: {
          status: locationPermission.status || 'unknown',
          detail:
            locationPermission.status === 'granted'
              ? 'Nearby safety scoring is available'
              : 'Required for nearby safety score and map context',
        },
        notifications: {
          status: notificationsStatus,
          detail: notificationsDetail,
        },
        camera: {
          status: cameraPermission.status || 'unknown',
          detail:
            cameraPermission.status === 'granted'
              ? 'Camera can be used for incident photos'
              : 'Required to capture incident photos',
        },
        photos: {
          status: mediaPermission.status || 'unknown',
          detail:
            mediaPermission.status === 'granted'
              ? 'Photo library access is available'
              : 'Required to attach photos from your library',
        },
      });
    } catch (error) {
      setAccessStatus({
        location: { status: 'unknown', detail: 'Could not read location permission status' },
        notifications: { status: 'unknown', detail: 'Could not read notification permission status' },
        camera: { status: 'unknown', detail: 'Could not read camera permission status' },
        photos: { status: 'unknown', detail: 'Could not read media permission status' },
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
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="h1" style={[styles.title, { color: theme.text }]}>Account</AppText>

      <ProfileHeader
        avatarUri={avatarUri}
        initials={initials}
        displayName={displayName}
        memberSince={memberSince}
        email={user?.email || 'User'}
        onAvatarPress={handleAvatarPress}
        onEditNamePress={openEditName}
      />

      <ThemeSection
        isDark={isDark}
        mode={mode}
        onThemeToggle={(value) => setThemeMode(value ? 'dark' : 'light')}
      />

      <PreferencesSection
        preferences={preferences}
        onLocationToggle={handleLocationToggle}
        onNotificationsToggle={handleNotificationsToggle}
        onDefaultAnonymousToggle={(value) => updatePreference('defaultAnonymous', value)}
        onSendTestNotification={handleSendTestNotification}
        feedbackMessage={inlinePreferenceFeedback}
      />

      <AccessStatusSection accessStatus={accessStatus} onOpenSettings={() => Linking.openSettings?.()} />

      <TouchableOpacity
        style={[styles.moreToggle, { borderColor: theme.border, backgroundColor: theme.card }]}
        onPress={() => setShowMore((prev) => !prev)}
      >
        <AppText variant="label" style={{ color: theme.text }}>More settings</AppText>
        <Ionicons name={showMore ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
      </TouchableOpacity>

      {showMore ? (
        <>
          <SupportSection
            onHelp={() => openLink('https://safesignal.org/help')}
            onTerms={() => openLink('https://safesignal.org/terms')}
            onPrivacy={() => openLink('https://safesignal.org/privacy')}
            onContactSupport={contactSupport}
          />

          <DangerZone onLogout={logout} onDeleteAccount={confirmDeleteAccount} />
        </>
      ) : null}

      <EditNameModal
        visible={isEditingName}
        pendingName={pendingName}
        onChangeName={setPendingName}
        onCancel={() => setIsEditingName(false)}
        onSave={handleSaveName}
      />
    </ScrollView>
  );
};

export default AccountScreen;
