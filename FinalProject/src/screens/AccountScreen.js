import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Linking, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components';

const AccountScreen = () => {
  const { logout, user } = useAuth();
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(true);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [defaultAnonymousEnabled, setDefaultAnonymousEnabled] = useState(false);

  const username = user?.username || user?.email || 'User';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : 'January 2026';
  const initials = username
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
            // TODO: Wire to backend delete account endpoint
            Alert.alert('Request Submitted', 'Your account deletion request has been queued.');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Account</Text>
      
      <Card style={styles.profileHeader}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
            <TouchableOpacity style={styles.avatarEdit}>
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.usernameRow}>
              <Text style={styles.username}>{username}</Text>
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="pencil" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.memberSince}>Joined {memberSince}</Text>
          </View>
        </View>
        <View style={styles.verificationRow}>
          <Ionicons
            name={user?.is_verified ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={user?.is_verified ? '#16a34a' : '#f59e0b'}
          />
          <Text style={styles.verificationText}>
            {user?.is_verified ? 'Email verified' : 'Email not verified'}
          </Text>
        </View>
      </Card>

      <Card style={styles.infoContainer}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email || 'User'}</Text>
      </Card>

      <Card style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingHint}>Reduce glare at night</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: '#d1d5db', true: '#4f46e5' }}
            thumbColor={darkModeEnabled ? '#1a73e8' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Location Services</Text>
            <Text style={styles.settingHint}>
              Status: {locationServicesEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Switch
            value={locationServicesEnabled}
            onValueChange={setLocationServicesEnabled}
            trackColor={{ false: '#d1d5db', true: '#10b981' }}
            thumbColor={locationServicesEnabled ? '#059669' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingHint}>Incident updates and alerts</Text>
          </View>
          <Switch
            value={pushNotificationsEnabled}
            onValueChange={setPushNotificationsEnabled}
            trackColor={{ false: '#d1d5db', true: '#60a5fa' }}
            thumbColor={pushNotificationsEnabled ? '#2563eb' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Default Anonymous</Text>
            <Text style={styles.settingHint}>Hide your identity by default</Text>
          </View>
          <Switch
            value={defaultAnonymousEnabled}
            onValueChange={setDefaultAnonymousEnabled}
            trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
            thumbColor={defaultAnonymousEnabled ? '#d97706' : '#f4f3f4'}
          />
        </View>
      </Card>

      <Card style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>About & Support</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>App Version</Text>
            <Text style={styles.settingHint}>v1.0.0</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => openLink('https://safesignal.org/help')}
        >
          <Text style={styles.linkText}>Help & FAQ</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => openLink('https://safesignal.org/terms')}
        >
          <Text style={styles.linkText}>Terms of Service</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => openLink('https://safesignal.org/privacy')}
        >
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={contactSupport}>
          <Text style={styles.linkText}>Contact Support</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </Card>
      
      {/* Add more user details here */}
      
      <Card style={styles.settingsContainer}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <Button title="Sign Out" onPress={logout} style={styles.signOutButton} />
        <View style={styles.dangerSpacing} />
        <Button
          title="Delete Account"
          onPress={confirmDeleteAccount}
          style={styles.deleteButton}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
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
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  verificationText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#374151',
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
  signOutButton: {
    backgroundColor: '#d9534f',
  },
  dangerSpacing: {
    height: 10,
  },
  deleteButton: {
    backgroundColor: '#b91c1c',
  },
});

export default AccountScreen;
