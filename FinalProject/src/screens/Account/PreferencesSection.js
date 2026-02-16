import React from 'react';
import { Switch, TouchableOpacity, View } from 'react-native';
import { AppText, Card } from '../../components';
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
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Preferences</AppText>

      <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}> 
        <View style={styles.settingInfo}>
          <AppText variant="label" style={[styles.settingLabel, { color: theme.text }]}>Location Services</AppText>
          <AppText variant="caption" style={[styles.settingHint, { color: theme.textSecondary }]}> 
            Status: {preferences.locationServices ? 'Enabled' : 'Disabled'}
          </AppText>
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
          <AppText variant="label" style={[styles.settingLabel, { color: theme.text }]}>Push Notifications</AppText>
          <AppText variant="caption" style={[styles.settingHint, { color: theme.textSecondary }]}> 
            Incident updates and alerts
          </AppText>
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
          <AppText variant="label" style={[styles.settingLabel, { color: theme.text }]}>Default Anonymous</AppText>
          <AppText variant="caption" style={[styles.settingHint, { color: theme.textSecondary }]}> 
            Hide your identity by default
          </AppText>
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
        <AppText variant="label" style={[styles.linkText, { color: theme.text }]}>Send Test Notification</AppText>
        <AppText variant="h5" style={[styles.linkArrow, { color: theme.textTertiary }]}>›</AppText>
      </TouchableOpacity>
    </Card>
  );
};

export default PreferencesSection;
