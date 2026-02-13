import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
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
        <Text style={styles.quickStatIcon}>🚨</Text>
        <Text style={[styles.quickStatNumber, { color: theme.text }]}>
          {quickStats?.activeNearby || 0}
        </Text>
        <Text style={[styles.quickStatLabel, { color: theme.text }]}>Active{'
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
        <Text style={styles.quickStatIcon}>✅</Text>
        <Text style={[styles.quickStatNumber, { color: theme.text }]}>
          {quickStats?.resolvedThisWeek || 0}
        </Text>
        <Text style={[styles.quickStatLabel, { color: theme.text }]}>Resolved{'
      </View>
    </View>
  );
};

export default QuickStatsRow;
