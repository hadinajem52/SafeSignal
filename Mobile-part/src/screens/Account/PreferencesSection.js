import React from 'react';
import { Switch, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const PreferencesSection = ({
  preferences,
  onLocationToggle,
  onNotificationsToggle,
  onDefaultAnonymousToggle,
  onFeedAutoplayToggle,
  onSendTestNotification,
  onSendFcmTestNotification,
  onSimulateWitnessPrompt,
  isSendingFcmTest,
  feedbackMessage,
}) => {
  const { theme } = useTheme();

  return (
    <Card style={[styles.settingsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}> 
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Preferences</AppText>

      <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}> 
        <View style={styles.settingInfo}>
          <AppText variant="label" style={[styles.settingLabel, { color: theme.text }]}>Witness Location Sharing</AppText>
          <AppText variant="caption" style={[styles.settingHint, { color: theme.textSecondary }]}> 
            {preferences.locationServices ? 'Enabled for nearby witness prompts' : 'Disabled'}
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

      <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}>
        <View style={styles.settingInfo}>
          <AppText variant="label" style={[styles.settingLabel, { color: theme.text }]}>Autoplay Feed Videos</AppText>
          <AppText variant="caption" style={[styles.settingHint, { color: theme.textSecondary }]}>
            {preferences.feedVideoAutoplay ? 'Videos play automatically (muted)' : 'Tap a video to play it'}
          </AppText>
        </View>
        <Switch
          value={preferences.feedVideoAutoplay}
          onValueChange={onFeedAutoplayToggle}
          trackColor={{ false: theme.switchTrackOff, true: theme.info }}
          thumbColor={preferences.feedVideoAutoplay ? theme.primary : theme.switchThumbOff}
        />
      </View>

      <TouchableOpacity
        style={[styles.linkRow, { borderBottomColor: theme.divider }]}
        onPress={onSendTestNotification}
      >
        <AppText variant="label" style={[styles.linkText, { color: theme.text }]}>Send Test Notification</AppText>
        <AppText variant="h5" style={[styles.linkArrow, { color: theme.textTertiary }]}>›</AppText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.linkRow, { borderBottomColor: theme.divider, opacity: isSendingFcmTest ? 0.55 : 1 }]}
        onPress={onSendFcmTestNotification}
        disabled={isSendingFcmTest}
      >
        <View style={styles.settingInfo}>
          <AppText variant="label" style={[styles.linkText, { color: theme.text }]}>
            {isSendingFcmTest ? 'Sending FCM Test...' : 'Send FCM Test Notification'}
          </AppText>
          <AppText variant="caption" style={[styles.settingHint, { color: theme.textSecondary }]}>
            Tests Firebase delivery to this device
          </AppText>
        </View>
        <AppText variant="h5" style={[styles.linkArrow, { color: theme.textTertiary }]}>›</AppText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.linkRow, { borderBottomColor: theme.divider }]}
        onPress={onSimulateWitnessPrompt}
      >
        <View style={styles.settingInfo}>
          <AppText variant="label" style={[styles.linkText, { color: theme.text }]}>
            Simulate Witness Prompt
          </AppText>
          <AppText variant="caption" style={[styles.settingHint, { color: theme.textSecondary }]}>
            Preview the nearby-witness prompt (simulation only)
          </AppText>
        </View>
        <AppText variant="h5" style={[styles.linkArrow, { color: theme.textTertiary }]}>›</AppText>
      </TouchableOpacity>

      {feedbackMessage ? (
        <View style={[styles.inlineFeedbackRow, { borderColor: `${theme.success}40`, backgroundColor: `${theme.success}14` }]}>
          <Ionicons name="checkmark-circle" size={14} color={theme.success} />
          <AppText variant="caption" style={[styles.inlineFeedbackText, { color: theme.success }]}>
            {feedbackMessage}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
};

export default PreferencesSection;
