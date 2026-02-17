import React from 'react';
import { Switch, View } from 'react-native';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const ThemeSection = ({ isDark, mode, onThemeToggle }) => {
  const { theme } = useTheme();

  return (
    <Card style={[styles.settingsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}> 
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Theme</AppText>

      <View style={styles.themePreviewRow}>
        <View style={[styles.themePreviewCard, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}> 
          <AppText variant="small" style={[styles.themePreviewTitle, { color: '#0F172A' }]}>Light</AppText>
          <View style={[styles.themePreviewBar, { backgroundColor: '#1D4ED8' }]} />
          <View style={[styles.themePreviewBar, styles.themePreviewBarShort, { backgroundColor: '#94A3B8' }]} />
        </View>
        <View style={styles.themePreviewDivider} />
        <View style={[styles.themePreviewCard, { backgroundColor: '#0F1729', borderColor: '#334155' }]}> 
          <AppText variant="small" style={[styles.themePreviewTitle, { color: '#F8FAFC' }]}>Dark</AppText>
          <View style={[styles.themePreviewBar, { backgroundColor: '#2DD4BF' }]} />
          <View style={[styles.themePreviewBar, styles.themePreviewBarShort, { backgroundColor: '#64748B' }]} />
        </View>
      </View>

      <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}> 
        <View style={styles.settingInfo}>
          <AppText variant="label" style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</AppText>
          <AppText variant="caption" style={[styles.settingHint, { color: theme.textSecondary }]}> 
            {mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}
          </AppText>
        </View>
        <Switch
          value={isDark}
          onValueChange={onThemeToggle}
          trackColor={{ false: theme.switchTrackOff, true: theme.primary }}
          thumbColor={isDark ? theme.primary : theme.switchThumbOff}
        />
      </View>
    </Card>
  );
};

export default ThemeSection;
