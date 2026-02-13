import React from 'react';
import { Switch, Text, View } from 'react-native';
import { Card } from '../../components';
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
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Theme</Text>

      <View style={[styles.settingRow, { borderBottomColor: theme.divider }]}> 
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
          <Text style={[styles.settingHint, { color: theme.textSecondary }]}>
            {mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'}
          </Text>
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
