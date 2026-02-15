import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const QuickStatsRow = ({ quickStats, onMapPress }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.quickStatsRow}>
      <TouchableOpacity
        style={[
          styles.quickStatCard,
          styles.activeCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderTopColor: theme.safetyPoor,
          },
        ]}
        onPress={onMapPress}
      >
        <AppText style={styles.quickStatIcon}>🚨</AppText>
        <AppText variant="h1" style={[styles.quickStatNumber, { color: theme.text }]}>
          {quickStats?.activeNearby || 0}
        </AppText>
        <AppText variant="caption" style={[styles.quickStatLabel, { color: theme.text }]}>
          Active{`\n`}Nearby
        </AppText>
      </TouchableOpacity>

      <View
        style={[
          styles.quickStatCard,
          styles.resolvedCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderTopColor: theme.safetyGood,
          },
        ]}
      >
        <AppText style={styles.quickStatIcon}>✅</AppText>
        <AppText variant="h1" style={[styles.quickStatNumber, { color: theme.text }]}>
          {quickStats?.resolvedThisWeek || 0}
        </AppText>
        <AppText variant="caption" style={[styles.quickStatLabel, { color: theme.text }]}>
          Resolved{`\n`}This Week
        </AppText>
      </View>
    </View>
  );
};

export default QuickStatsRow;
