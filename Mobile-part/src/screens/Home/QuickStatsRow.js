import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const QuickStatsRow = ({ quickStats, onMapPress }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.quickStatsRow}>
      <Pressable style={styles.quickStatPressable} onPress={onMapPress}>
        {({ pressed }) => (
          <View
            style={[
              styles.quickStatCard,
              styles.activeCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderTopColor: theme.safetyPoor,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <View style={[styles.quickStatIconWrap, { backgroundColor: `${theme.safetyPoor}15` }]}>
              <Ionicons name="warning-outline" size={20} color={theme.safetyPoor} style={styles.quickStatIcon} />
            </View>
            <AppText variant="h1" style={[styles.quickStatNumber, { color: theme.text }]}> 
              {quickStats?.activeNearby || 0}
            </AppText>
            <AppText variant="caption" style={[styles.quickStatLabel, { color: theme.text }]}> 
              Active Nearby
            </AppText>
          </View>
        )}
      </Pressable>

      <Pressable style={styles.quickStatPressable} onPress={onMapPress}>
        {({ pressed }) => (
          <View
            style={[
              styles.quickStatCard,
              styles.resolvedCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderTopColor: theme.safetyGood,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <View style={[styles.quickStatIconWrap, { backgroundColor: `${theme.safetyGood}15` }]}> 
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.safetyGood} style={styles.quickStatIcon} />
            </View>
            <AppText variant="h1" style={[styles.quickStatNumber, { color: theme.text }]}> 
              {quickStats?.resolvedThisWeek || 0}
            </AppText>
            <AppText variant="caption" style={[styles.quickStatLabel, { color: theme.text }]}> 
              Resolved This Week
            </AppText>
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default QuickStatsRow;
