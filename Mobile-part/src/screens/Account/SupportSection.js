import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const SupportSection = ({ onHelp, onTerms, onPrivacy, onContactSupport }) => {
  const { theme } = useTheme();

  return (
    <Card style={[styles.settingsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}> 
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>About and Support</AppText>

      <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}> 
        <View style={styles.settingInfo}>
          <AppText variant="label" style={[styles.settingLabel, { color: theme.text }]}>App Version</AppText>
          <AppText variant="caption" style={[styles.settingHint, { color: theme.textSecondary }]}>v1.0.0</AppText>
        </View>
      </View>

      <TouchableOpacity style={[styles.linkRow, { borderBottomColor: theme.divider }]} onPress={onHelp}>
        <AppText variant="label" style={[styles.linkText, { color: theme.text }]}>Help and FAQ</AppText>
        <AppText variant="h5" style={[styles.linkArrow, { color: theme.textTertiary }]}>›</AppText>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.linkRow, { borderBottomColor: theme.divider }]} onPress={onTerms}>
        <AppText variant="label" style={[styles.linkText, { color: theme.text }]}>Terms of Service</AppText>
        <AppText variant="h5" style={[styles.linkArrow, { color: theme.textTertiary }]}>›</AppText>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.linkRow, { borderBottomColor: theme.divider }]} onPress={onPrivacy}>
        <AppText variant="label" style={[styles.linkText, { color: theme.text }]}>Privacy Policy</AppText>
        <AppText variant="h5" style={[styles.linkArrow, { color: theme.textTertiary }]}>›</AppText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.linkRow, { borderBottomColor: theme.divider }]}
        onPress={onContactSupport}
      >
        <AppText variant="label" style={[styles.linkText, { color: theme.text }]}>Contact Support</AppText>
        <AppText variant="h5" style={[styles.linkArrow, { color: theme.textTertiary }]}>›</AppText>
      </TouchableOpacity>
    </Card>
  );
};

export default SupportSection;
