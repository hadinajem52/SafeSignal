import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import incidentConstants from '../../../constants/incident';
import { formatDate } from '../utils/dateUtils';
import { AppText, Card, SeverityBadge, StatusBadge, IncidentTimeline } from '../components';
import { useTheme } from '../context/ThemeContext';

const { CATEGORY_DISPLAY, STATUS_LABELS } = incidentConstants;

const IncidentDetailScreen = ({ route }) => {
  const { incident } = route.params || {};
  const { theme } = useTheme();

  if (!incident) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.surface }]}> 
        <AppText variant="body" style={[styles.emptyText, { color: theme.textSecondary }]}>Incident details not available.</AppText>
      </View>
    );
  }

  const categoryConfig = CATEGORY_DISPLAY[incident.category] || CATEGORY_DISPLAY.other;
  const statusLabel = STATUS_LABELS[incident.status] || incident.status;
  const latitude = Number(incident?.location?.latitude);
  const longitude = Number(incident?.location?.longitude);
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const reportedAtRaw = incident.createdAt || incident.incident_date;
  const reportedAtDate = reportedAtRaw ? new Date(reportedAtRaw) : null;
  const reportedAtLabel =
    reportedAtDate && !Number.isNaN(reportedAtDate.getTime())
      ? formatDate(reportedAtDate)
      : 'Date unavailable';
  const closureOutcome = incident.closure_outcome
    ? incident.closure_outcome.replace('_', ' ')
    : null;
  const resolvedLabel = closureOutcome
    ? `${statusLabel} - ${closureOutcome.replace(/\b\w/g, (char) => char.toUpperCase())}`
    : statusLabel;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.surface }]} contentContainerStyle={styles.contentContainer}>
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.surface }]}> 
            <Ionicons name={categoryConfig.mapIcon || 'help-circle-outline'} size={15} color={theme.primary} style={styles.categoryIcon} />
            <AppText variant="caption" style={[styles.categoryText, { color: theme.text }]}>{categoryConfig.label}</AppText>
          </View>
          <View style={styles.badgesRow}>
            {incident.severity ? <SeverityBadge severity={incident.severity} /> : null}
            <StatusBadge status={incident.status} />
          </View>
        </View>
        <AppText variant="h3" style={[styles.title, { color: theme.text }]}>{incident.title}</AppText>
        <AppText variant="bodySmall" style={[styles.subtitle, { color: theme.textSecondary }]}>{resolvedLabel}</AppText>
        {closureOutcome ? (
          <AppText variant="caption" style={[styles.outcomeText, { color: theme.success }]}>Outcome: {closureOutcome}</AppText>
        ) : null}
      </Card>

      <Card style={styles.sectionCard}>
        <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Description</AppText>
        <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{incident.description}</AppText>
      </Card>

      <Card style={styles.sectionCard}>
        <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Location</AppText>
        <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}> 
          {hasValidCoordinates
            ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            : incident.locationName || 'Location not set'}
        </AppText>
      </Card>

      <Card style={styles.sectionCard}>
        <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Reported</AppText>
        <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{reportedAtLabel}</AppText>
      </Card>
      
      <Card style={styles.timelineCard}>
        <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Updates & Messages</AppText>
        <View style={styles.timelineContainer}>
          <IncidentTimeline 
            incidentId={incident.incident_id || incident.id} 
            incidentStatus={incident.status}
          />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  headerCard: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
  },
  badgesRow: {
    alignItems: 'flex-end',
    gap: 6,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
  },
  outcomeText: {
    marginTop: 4,
  },
  sectionCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 6,
  },
  sectionText: {
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
  },
  timelineCard: {
    marginBottom: 12,
    padding: 12,
  },
  timelineContainer: {
    height: 400,
    marginTop: 8,
  },
});

export default IncidentDetailScreen;
