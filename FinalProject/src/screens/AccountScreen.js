import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Linking,
  ScrollView,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import useUserPreferences from '../hooks/useUserPreferences';
import { Button, Card } from '../components';

const AccountScreen = () => {
  const { logout, user } = useAuth();
  const { preferences, updatePreference } = useUserPreferences();
  const [isEditingName, setIsEditingName] = useState(false);
  const [pendingName, setPendingName] = useState('');

  const displayName = useMemo(() => {
    const savedName = preferences.displayName?.trim();
    return savedName || user?.username || user?.email || 'User';
  }, [preferences.displayName, user]);

  const avatarUri = preferences.avatarUri || '';
  const isDarkMode = preferences.darkMode;

  const username = user?.username || user?.email || 'User';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : 'January 2026';
  const initials = displayName
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
              Alert.alert('Permission Required', 'Photo library permission is needed to choose a photo.');
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
    if (!value) {
      Alert.alert(
        'Location Disabled',
        'Location access is disabled for the app. You can re-enable it in system settings.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings?.() },
          { text: 'OK' },
        ]
      );
    }
  };

  const handleNotificationsToggle = (value) => {
    updatePreference('pushNotifications', value);
    if (!value) {
      Alert.alert(
        'Notifications Disabled',
        'Notification permissions can be managed in system settings.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings?.() },
          { text: 'OK' },
        ]
      );
    }
  };

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={[styles.title, isDarkMode && styles.textPrimaryDark]}>Account</Text>
      
      <Card style={[styles.profileHeader, isDarkMode && styles.cardDark]}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
            <TouchableOpacity style={styles.avatarEdit} onPress={handleAvatarPress}>
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.usernameRow}>
              <Text style={[styles.username, isDarkMode && styles.textPrimaryDark]}>{displayName}</Text>
              <TouchableOpacity style={styles.editButton} onPress={openEditName}>
                <Ionicons name="pencil" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.memberSince, isDarkMode && styles.textSecondaryDark]}>
              Joined {memberSince}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={[styles.infoContainer, isDarkMode && styles.cardDark]}>
        <Text style={[styles.label, isDarkMode && styles.textSecondaryDark]}>Email:</Text>
        <Text style={[styles.value, isDarkMode && styles.textPrimaryDark]}>{user?.email || 'User'}</Text>
      </Card>

      <Card style={[styles.settingsContainer, isDarkMode && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textPrimaryDark]}>Settings</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textPrimaryDark]}>Dark Mode</Text>
            <Text style={[styles.settingHint, isDarkMode && styles.textSecondaryDark]}>
              Reduce glare at night
            </Text>
          </View>
          <Switch
            value={preferences.darkMode}
            onValueChange={(value) => updatePreference('darkMode', value)}
            trackColor={{ false: '#d1d5db', true: '#4f46e5' }}
            thumbColor={preferences.darkMode ? '#1a73e8' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textPrimaryDark]}>
              Location Services
            </Text>
            <Text style={[styles.settingHint, isDarkMode && styles.textSecondaryDark]}>
              Status: {preferences.locationServices ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Switch
            value={preferences.locationServices}
            onValueChange={handleLocationToggle}
            trackColor={{ false: '#d1d5db', true: '#10b981' }}
            thumbColor={preferences.locationServices ? '#059669' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textPrimaryDark]}>
              Push Notifications
            </Text>
            <Text style={[styles.settingHint, isDarkMode && styles.textSecondaryDark]}>
              Incident updates and alerts
            </Text>
          </View>
          <Switch
            value={preferences.pushNotifications}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: '#d1d5db', true: '#60a5fa' }}
            thumbColor={preferences.pushNotifications ? '#2563eb' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textPrimaryDark]}>
              Default Anonymous
            </Text>
            <Text style={[styles.settingHint, isDarkMode && styles.textSecondaryDark]}>
              Hide your identity by default
            </Text>
          </View>
          <Switch
            value={preferences.defaultAnonymous}
            onValueChange={(value) => updatePreference('defaultAnonymous', value)}
            trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
            thumbColor={preferences.defaultAnonymous ? '#d97706' : '#f4f3f4'}
          />
        </View>
      </Card>

      <Card style={[styles.settingsContainer, isDarkMode && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textPrimaryDark]}>
          About & Support
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, isDarkMode && styles.textPrimaryDark]}>
              App Version
            </Text>
            <Text style={[styles.settingHint, isDarkMode && styles.textSecondaryDark]}>
              v1.0.0
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => openLink('https://safesignal.org/help')}
        >
          <Text style={[styles.linkText, isDarkMode && styles.textPrimaryDark]}>Help & FAQ</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => openLink('https://safesignal.org/terms')}
        >
          <Text style={[styles.linkText, isDarkMode && styles.textPrimaryDark]}>Terms of Service</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => openLink('https://safesignal.org/privacy')}
        >
          <Text style={[styles.linkText, isDarkMode && styles.textPrimaryDark]}>Privacy Policy</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={contactSupport}>
          <Text style={[styles.linkText, isDarkMode && styles.textPrimaryDark]}>Contact Support</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </Card>
      
      {/* Add more user details here */}
      
      <Card style={[styles.settingsContainer, isDarkMode && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textPrimaryDark]}>Danger Zone</Text>
        <Button title="Sign Out" onPress={logout} style={styles.signOutButton} />
        <View style={styles.dangerSpacing} />
        <Button
          title="Delete Account"
          onPress={confirmDeleteAccount}
          style={styles.deleteButton}
        />
      </Card>

      <Modal transparent visible={isEditingName} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDarkMode && styles.cardDark]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textPrimaryDark]}>
              Edit Display Name
            </Text>
            <TextInput
              style={[styles.modalInput, isDarkMode && styles.inputDark]}
              value={pendingName}
              onChangeText={setPendingName}
              placeholder="Enter display name"
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setIsEditingName(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Save"
                onPress={handleSaveName}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 20,
    textAlign: 'center',
  },
  profileHeader: {
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: '#111827',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileActionButton: {
    marginTop: 12,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  editButton: {
    marginLeft: 8,
  },
  memberSince: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  infoContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  settingsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  linkText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
  },
  linkArrow: {
    fontSize: 18,
    color: '#9ca3af',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  settingHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    fontWeight: '500',
  },
  textPrimaryDark: {
    color: '#f9fafb',
  },
  textSecondaryDark: {
    color: '#cbd5f5',
  },
  signOutButton: {
    backgroundColor: '#d9534f',
  },
  dangerSpacing: {
    height: 10,
  },
  deleteButton: {
    backgroundColor: '#b91c1c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  inputDark: {
    backgroundColor: '#0b1220',
    borderColor: '#1f2937',
    color: '#f9fafb',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 10,
    minWidth: 100,
  },
});

export default AccountScreen;
