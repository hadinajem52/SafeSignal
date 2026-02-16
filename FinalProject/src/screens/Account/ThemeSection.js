import React from 'react';
import { Switch, View } from 'react-native';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const ThemeSection = ({ isDark, mode, onThemeToggle }) => {
  const { theme } = useTheme();

  return (
    <Card
      style={[
        styles.settingsContainer,
        { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
      ]}
    >
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Theme</AppText>

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
