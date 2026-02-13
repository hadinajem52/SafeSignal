import React from 'react';
import { Switch, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const PreferencesSection = ({
  preferences,
  onLocationToggle,
  onNotificationsToggle,
  onDefaultAnonymousToggle,
  onSendTestNotification,
}) => {
  const { theme } = useTheme();

  return (
    <Card
      style={[
        styles.settingsContainer,
        { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>

      <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}> 
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>Location Services</Text>
          <Text style={[styles.settingHint, { color: theme.textSecondary }]}>
            Status: {preferences.locationServices ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
        <Switch
          value={preferences.locationServices}
          onValueChange={onLocationToggle}
          trackColor={{ false: theme.switchTrackOff, true: theme.success }}
          thumbColor={preferences.locationServices ? theme.success : theme.switchThumbOff}
        />
      </View>

      <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}> 
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>Push Notifications</Text>
          <Text style={[styles.settingHint, { color: theme.textSecondary }]}>Incident updates and alerts</Text>
        </View>
        <Switch
          value={preferences.pushNotifications}
          onValueChange={onNotificationsToggle}
          trackColor={{ false: theme.switchTrackOff, true: theme.info }}
          thumbColor={preferences.pushNotifications ? theme.primary : theme.switchThumbOff}
        />
      </View>

      <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}> 
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>Default Anonymous</Text>
          <Text style={[styles.settingHint, { color: theme.textSecondary }]}>Hide your identity by default</Text>
        </View>
        <Switch
          value={preferences.defaultAnonymous}
          onValueChange={onDefaultAnonymousToggle}
          trackColor={{ false: theme.switchTrackOff, true: theme.warning }}
          thumbColor={preferences.defaultAnonymous ? theme.warning : theme.switchThumbOff}
        />
      </View>

      <TouchableOpacity
        style={[styles.linkRow, { borderBottomColor: theme.divider }]}
        onPress={onSendTestNotification}
      >
        <Text style={[styles.linkText, { color: theme.text }]}>Send Test Notification</Text>
        <Text style={[styles.linkArrow, { color: theme.textTertiary }]}>›</Text>
      </TouchableOpacity>
    </Card>
  );
};

export default PreferencesSection;
