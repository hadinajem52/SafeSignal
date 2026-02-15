import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const RecentActivity = ({ recentActivity, onPress }) => {
  const { theme } = useTheme();

  if (!recentActivity?.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>🕐 Recent Activity</AppText>
      <Card style={styles.activityContainer}>
        {recentActivity.slice(0, 3).map((activity, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.activityItem, { borderBottomColor: theme.divider }]}
            onPress={onPress}
          >
            <View style={[styles.activityDot, { backgroundColor: theme.primary }]} />
            <View style={styles.activityContent}>
              <AppText variant="body" style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>
                {activity.incidentTitle}
              </AppText>
              <AppText variant="caption" style={[styles.activityType, { color: theme.textSecondary }]}> 
                {activity.type.replace(/_/g, ' ')}
              </AppText>
            </View>
            <AppText variant="small" style={[styles.activityTime, { color: theme.textTertiary }]}> 
              {new Date(activity.timestamp).toLocaleDateString()}
            </AppText>
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );
};

export default RecentActivity;
