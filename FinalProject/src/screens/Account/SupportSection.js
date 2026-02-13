import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const SupportSection = ({ onHelp, onTerms, onPrivacy, onContactSupport }) => {
  const { theme } = useTheme();

  return (
    <Card
      style={[
        styles.settingsContainer,
        { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.text }]}>About and Support</Text>

      <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}> 
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>App Version</Text>
          <Text style={[styles.settingHint, { color: theme.textSecondary }]}>v1.0.0</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.linkRow, { borderBottomColor: theme.divider }]} onPress={onHelp}>
        <Text style={[styles.linkText, { color: theme.text }]}>Help and FAQ</Text>
        <Text style={[styles.linkArrow, { color: theme.textTertiary }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.linkRow, { borderBottomColor: theme.divider }]} onPress={onTerms}>
        <Text style={[styles.linkText, { color: theme.text }]}>Terms of Service</Text>
        <Text style={[styles.linkArrow, { color: theme.textTertiary }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.linkRow, { borderBottomColor: theme.divider }]} onPress={onPrivacy}>
        <Text style={[styles.linkText, { color: theme.text }]}>Privacy Policy</Text>
        <Text style={[styles.linkArrow, { color: theme.textTertiary }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.linkRow, { borderBottomColor: theme.divider }]}
        onPress={onContactSupport}
      >
        <Text style={[styles.linkText, { color: theme.text }]}>Contact Support</Text>
        <Text style={[styles.linkArrow, { color: theme.textTertiary }]}>›</Text>
      </TouchableOpacity>
    </Card>
  );
};

export default SupportSection;
