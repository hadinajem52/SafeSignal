import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import incidentConstants from '../../../constants/incident';
import { formatDate } from '../utils/dateUtils';
import { Card, SeverityBadge, StatusBadge, IncidentTimeline } from '../components';
import { useTheme } from '../context/ThemeContext';

const { CATEGORY_DISPLAY, STATUS_LABELS } = incidentConstants;

const IncidentDetailScreen = ({ route }) => {
  const { incident } = route.params || {};
  const { theme } = useTheme();

  if (!incident) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.surface }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Incident details not available.</Text>
      </View>
    );
  }

  const categoryConfig = CATEGORY_DISPLAY[incident.category] || CATEGORY_DISPLAY.other;
  const statusLabel = STATUS_LABELS[incident.status] || incident.status;
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
            <Text style={styles.categoryIcon}>{categoryConfig.trendIcon || '📝'}</Text>
            <Text style={[styles.categoryText, { color: theme.text }]}>{categoryConfig.label}</Text>
          </View>
          <View style={styles.badgesRow}>
            {incident.severity ? <SeverityBadge severity={incident.severity} /> : null}
            <StatusBadge status={incident.status} />
          </View>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{incident.title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{resolvedLabel}</Text>
        {closureOutcome ? (
          <Text style={[styles.outcomeText, { color: theme.success }]}>Outcome: {closureOutcome}</Text>
        ) : null}
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Description</Text>
        <Text style={[styles.sectionText, { color: theme.textSecondary }]}>{incident.description}</Text>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
        <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
          {incident.location?.latitude && incident.location?.longitude
            ? `${incident.location.latitude.toFixed(4)}, ${incident.location.longitude.toFixed(4)}`
            : incident.locationName || 'Location not set'}
        </Text>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Reported</Text>
        <Text style={[styles.sectionText, { color: theme.textSecondary }]}>{formatDate(incident.createdAt || incident.incident_date)}</Text>
      </Card>
      
      <Card style={styles.timelineCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Updates & Messages</Text>
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
    fontSize: 12,
    fontWeight: '600',
  },
  badgesRow: {
    alignItems: 'flex-end',
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
  },
  outcomeText: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  sectionCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
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