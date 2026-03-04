import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import incidentConstants from '../../../constants/incident';
import { formatDate } from '../utils/dateUtils';
import { AppText, Card, SeverityBadge, StatusBadge, IncidentTimeline } from '../components';
import { useTheme } from '../context/ThemeContext';
import styles from './incidentDetailStyles';

const { CATEGORY_DISPLAY, STATUS_LABELS } = incidentConstants;

const IncidentDetailScreen = ({ route, navigation }) => {
  const { incident, source } = route.params || {};
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  if (!incident) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.surface, paddingTop: insets.top }]}> 
        <AppText variant="body" style={{ color: theme.textSecondary }}>Incident details not available.</AppText>
      </View>
    );
  }

  const categoryConfig = CATEGORY_DISPLAY[incident.category] || CATEGORY_DISPLAY.other;
  const displayStatus = incident.status === 'police_closed' ? 'resolved' : incident.status;
  const statusLabel = STATUS_LABELS[displayStatus] || displayStatus;
  const latitude = Number(incident?.location?.latitude);
  const longitude = Number(incident?.location?.longitude);
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const reportedAtRaw = incident.createdAt || incident.created_at || incident.incident_date || incident.closedAt;
  const reportedAtDate = reportedAtRaw ? new Date(reportedAtRaw) : null;
  const reportedAtLabel =
    reportedAtDate && !Number.isNaN(reportedAtDate.getTime())
      ? formatDate(reportedAtDate)
      : 'Date unavailable';
  const closureOutcomeValue = incident.closure_outcome || incident.closureOutcome;
  const closureOutcome = closureOutcomeValue
    ? closureOutcomeValue.replace(/_/g, ' ')
    : null;
  const resolvedLabel = closureOutcome
    ? `${statusLabel} - ${closureOutcome.replace(/\b\w/g, (char) => char.toUpperCase())}`
    : statusLabel;
  const description = incident.description || incident.closure_details || incident.closureDetails || 'No description available.';
  const closureDetails = incident.closure_details || incident.closureDetails || '';
  const locationLabel = incident.locationName || incident.location_name || 'Location not set';
  const showTimeline = source !== 'community_feed';

  return (
    <View style={[styles.screenWrapper, { backgroundColor: theme.surface, paddingTop: insets.top }]}>
      <View style={[styles.backHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
          <AppText variant="body" style={{ color: theme.text }}>Back</AppText>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight + 8 }]}
        showsVerticalScrollIndicator={false}
      >
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.surface }]}> 
            <Ionicons name={categoryConfig.mapIcon || 'help-circle-outline'} size={15} color={theme.primary} style={styles.categoryIcon} />
            <AppText variant="caption" style={{ color: theme.text }}>{categoryConfig.label}</AppText>
          </View>
          <View style={styles.badgesRow}>
            {incident.severity ? <SeverityBadge severity={incident.severity} /> : null}
            <StatusBadge status={displayStatus} />
          </View>
        </View>
        <AppText variant="h3" style={[styles.title, { color: theme.text }]}>{incident.title}</AppText>
        <AppText variant="bodySmall" style={{ color: theme.textSecondary }}>{resolvedLabel}</AppText>
        {closureOutcome ? (
          <AppText variant="caption" style={[styles.outcomeText, { color: theme.success }]}>Outcome: {closureOutcome}</AppText>
        ) : null}
      </Card>

      <Card style={styles.sectionCard}>
        <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Description</AppText>
        <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{description}</AppText>
      </Card>

      {closureDetails ? (
        <Card style={styles.sectionCard}>
          <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Closure Details</AppText>
          <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{closureDetails}</AppText>
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Location</AppText>
        <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}> 
          {hasValidCoordinates
            ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            : locationLabel}
        </AppText>
      </Card>

      <Card style={styles.sectionCard}>
        <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Reported</AppText>
        <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{reportedAtLabel}</AppText>
      </Card>
      
      {showTimeline ? (
        <Card style={styles.timelineCard}>
          <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Updates & Messages</AppText>
          <View style={styles.timelineContainer}>
            <IncidentTimeline 
              incidentId={incident.incident_id || incident.id}
            />
          </View>
        </Card>
      ) : null}
    </ScrollView>
    </View>
  );
};

export default IncidentDetailScreen;
