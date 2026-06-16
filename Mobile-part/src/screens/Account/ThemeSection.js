import React from 'react';
import { Switch, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const ThemeSection = ({ mode, isDark, onSelectMode }) => {
  const { theme } = useTheme();
  const isSystem = mode === 'system';
  const lightActive = !isSystem && !isDark;
  const darkActive = !isSystem && isDark;

  return (
    <Card style={[styles.settingsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Theme</AppText>

      <View style={[styles.themeAutoRow, { borderBottomColor: theme.divider }]}>
        <View style={styles.settingInfo}>
          <AppText variant="label" style={[styles.settingLabel, { color: theme.text }]}>Match system</AppText>
          <AppText variant="caption" style={[styles.settingHint, { color: theme.textSecondary }]}>
            {isSystem ? `Following your device (${isDark ? 'Dark' : 'Light'})` : 'Using a fixed theme below'}
          </AppText>
        </View>
        <Switch
          value={isSystem}
          onValueChange={(value) => onSelectMode(value ? 'system' : isDark ? 'dark' : 'light')}
          trackColor={{ false: theme.switchTrackOff, true: theme.primary }}
          thumbColor={isSystem ? '#FFFFFF' : theme.switchThumbOff}
        />
      </View>

      <View style={styles.themePreviewRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onSelectMode('light')}
          style={[
            styles.themePreviewCard,
            { backgroundColor: '#F8FAFC', borderColor: lightActive ? theme.primary : '#CBD5E1' },
            lightActive && [styles.themePreviewCardActive, { shadowColor: theme.primary }],
            isSystem && styles.themePreviewCardMuted,
          ]}
        >
          <View style={styles.themePreviewHeader}>
            <AppText variant="small" style={[styles.themePreviewTitle, { color: '#0F172A' }]}>Light</AppText>
            {lightActive ? <Ionicons name="checkmark-circle" size={16} color={theme.primary} /> : null}
          </View>
          <View style={[styles.themePreviewBar, { backgroundColor: '#1D4ED8' }]} />
          <View style={[styles.themePreviewBar, styles.themePreviewBarShort, { backgroundColor: '#94A3B8' }]} />
        </TouchableOpacity>

        <View style={styles.themePreviewDivider} />

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onSelectMode('dark')}
          style={[
            styles.themePreviewCard,
            { backgroundColor: '#0F1729', borderColor: darkActive ? theme.primary : '#334155' },
            darkActive && [styles.themePreviewCardActive, { shadowColor: theme.primary }],
            isSystem && styles.themePreviewCardMuted,
          ]}
        >
          <View style={styles.themePreviewHeader}>
            <AppText variant="small" style={[styles.themePreviewTitle, { color: '#F8FAFC' }]}>Dark</AppText>
            {darkActive ? <Ionicons name="checkmark-circle" size={16} color={theme.primary} /> : null}
          </View>
          <View style={[styles.themePreviewBar, { backgroundColor: '#2DD4BF' }]} />
          <View style={[styles.themePreviewBar, styles.themePreviewBarShort, { backgroundColor: '#64748B' }]} />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

export default ThemeSection;
