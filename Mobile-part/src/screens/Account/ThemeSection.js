import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const ThemeSection = ({ isDark, onThemeToggle }) => {
  const { theme } = useTheme();

  return (
    <Card style={[styles.settingsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Theme</AppText>

      <View style={styles.themePreviewRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onThemeToggle(false)}
          style={[
            styles.themePreviewCard,
            { backgroundColor: '#F8FAFC', borderColor: !isDark ? theme.primary : '#CBD5E1' },
            !isDark && [styles.themePreviewCardActive, { shadowColor: theme.primary }],
          ]}
        >
          <View style={styles.themePreviewHeader}>
            <AppText variant="small" style={[styles.themePreviewTitle, { color: '#0F172A' }]}>Light</AppText>
            {!isDark ? <Ionicons name="checkmark-circle" size={16} color={theme.primary} /> : null}
          </View>
          <View style={[styles.themePreviewBar, { backgroundColor: '#1D4ED8' }]} />
          <View style={[styles.themePreviewBar, styles.themePreviewBarShort, { backgroundColor: '#94A3B8' }]} />
        </TouchableOpacity>

        <View style={styles.themePreviewDivider} />

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onThemeToggle(true)}
          style={[
            styles.themePreviewCard,
            { backgroundColor: '#0F1729', borderColor: isDark ? theme.primary : '#334155' },
            isDark && [styles.themePreviewCardActive, { shadowColor: theme.primary }],
          ]}
        >
          <View style={styles.themePreviewHeader}>
            <AppText variant="small" style={[styles.themePreviewTitle, { color: '#F8FAFC' }]}>Dark</AppText>
            {isDark ? <Ionicons name="checkmark-circle" size={16} color={theme.primary} /> : null}
          </View>
          <View style={[styles.themePreviewBar, { backgroundColor: '#2DD4BF' }]} />
          <View style={[styles.themePreviewBar, styles.themePreviewBarShort, { backgroundColor: '#64748B' }]} />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

export default ThemeSection;
