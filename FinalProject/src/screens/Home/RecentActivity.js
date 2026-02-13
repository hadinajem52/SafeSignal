import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const RecentActivity = ({ recentActivity, onPress }) => {
  const { theme } = useTheme();

  if (!recentActivity?.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>🕐 Recent Activity</Text>
      <Card style={styles.activityContainer}>
        {recentActivity.slice(0, 3).map((activity, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.activityItem, { borderBottomColor: theme.divider }]}
            onPress={onPress}
          >
            <View style={[styles.activityDot, { backgroundColor: theme.primary }]} />
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>
                {activity.incidentTitle}
              </Text>
              <Text style={[styles.activityType, { color: theme.textSecondary }]}>
                {activity.type.replace(/_/g, ' ')}
              </Text>
            </View>
            <Text style={[styles.activityTime, { color: theme.textTertiary }]}>
              {new Date(activity.timestamp).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );
};

export default RecentActivity;
