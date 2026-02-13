import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import incidentConstants from '../../../../constants/incident';
import { Card, SeverityBadge, StatusBadge } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { formatDate } from '../../utils/dateUtils';
import styles from './myReportsStyles';

const { INCIDENT_CATEGORIES } = incidentConstants;

const CATEGORY_ICON_MAP = INCIDENT_CATEGORIES.reduce((acc, category) => {
  acc[category.value] = category.icon;
  return acc;
}, {});

const ReportItem = ({ item, onPress }) => {
  const { theme } = useTheme();
  const categoryIcon = CATEGORY_ICON_MAP[item.category] || '📝';
  const date = formatDate(item.createdAt);

  const hasLocation = item.location && typeof item.location.latitude === 'number';
  const locationDisplay = hasLocation
    ? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
    : item.locationName || 'Location not set';

  return (
    <TouchableOpacity style={styles.incidentCard} onPress={() => onPress(item)} activeOpacity={0.7}>
      <Card
        style={[
          styles.incidentCardInner,
          { borderColor: theme.border, borderWidth: 1, borderBottomColor: theme.divider },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.surface }]}>
            <Text style={styles.categoryIcon}>{categoryIcon}</Text>
          </View>
          <View style={styles.badgesRight}>
            {item.severity ? <SeverityBadge severity={item.severity} style={styles.severityBadge} /> : null}
            <StatusBadge status={item.status} style={styles.statusBadge} />
          </View>
        </View>

        <Text style={[styles.incidentTitle, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={[styles.incidentDescription, { color: theme.textSecondary }]} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={[styles.cardFooter, { borderTopColor: theme.divider }]}> 
          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={[styles.locationText, { color: theme.textSecondary }]}>{locationDisplay}</Text>
          </View>
          <Text style={[styles.dateText, { color: theme.textTertiary }]}>{date}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

export default ReportItem;
