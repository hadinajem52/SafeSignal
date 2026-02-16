import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { formatTimeAgo } from '../../utils/dateUtils';
import styles from './homeStyles';

const getActivityColor = (theme, type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('verified') || normalized.includes('resolved')) return theme.safetyGood;
  if (normalized.includes('rejected')) return theme.error;
  if (normalized.includes('review') || normalized.includes('pending')) return theme.warning;
  return theme.primary;
};

const RecentActivity = ({ recentActivity, onPress }) => {
  const { theme } = useTheme();

  if (!recentActivity?.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name="time-outline" size={18} color={theme.text} style={styles.sectionTitleIcon} />
        <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</AppText>
      </View>
      <Card style={styles.activityContainer}>
        {recentActivity.slice(0, 3).map((activity, index) => {
          const activityColor = getActivityColor(theme, activity.type);
          const activityTypeLabel = (activity.type ? String(activity.type) : 'updated').replace(/_/g, ' ');

          return (
            <TouchableOpacity
              key={activity.id || `${activity.timestamp || 'activity'}-${index}`}
              style={[styles.activityItem, { borderBottomColor: theme.divider }]}
              onPress={onPress}
            >
              <View style={styles.activityTimelineColumn}>
                <View style={[styles.activityDot, { backgroundColor: activityColor }]} />
                {index < Math.min(recentActivity.length, 3) - 1 ? (
                  <View style={[styles.activityConnector, { backgroundColor: theme.divider }]} />
                ) : null}
              </View>
              <View style={styles.activityContent}>
                <AppText variant="body" style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>
                  {activity.incidentTitle}
                </AppText>
                <AppText variant="caption" style={[styles.activityType, { color: theme.textSecondary }]}> 
                  {activityTypeLabel}
                </AppText>
              </View>
              <AppText variant="small" style={[styles.activityTime, { color: theme.textTertiary }]}> 
                {activity.timestamp ? formatTimeAgo(activity.timestamp) : 'Just now'}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </Card>
    </View>
  );
};

export default RecentActivity;
