import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import incidentConstants from '../../../constants/incident';
import { formatDate } from '../utils/dateUtils';
import { Card, SeverityBadge, StatusBadge } from '../components';

const { CATEGORY_DISPLAY, STATUS_LABELS } = incidentConstants;

const IncidentDetailScreen = ({ route }) => {
  const { incident } = route.params || {};

  if (!incident) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Incident details not available.</Text>
      </View>
    );
  }

  const categoryConfig = CATEGORY_DISPLAY[incident.category] || CATEGORY_DISPLAY.other;
  const statusLabel = STATUS_LABELS[incident.status] || incident.status;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryIcon}>{categoryConfig.trendIcon || '📝'}</Text>
            <Text style={styles.categoryText}>{categoryConfig.label}</Text>
          </View>
          <View style={styles.badgesRow}>
            {incident.severity ? <SeverityBadge severity={incident.severity} /> : null}
            <StatusBadge status={incident.status} />
          </View>
        </View>
        <Text style={styles.title}>{incident.title}</Text>
        <Text style={styles.subtitle}>{statusLabel}</Text>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.sectionText}>{incident.description}</Text>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.sectionText}>
          {incident.location?.latitude && incident.location?.longitude
            ? `${incident.location.latitude.toFixed(4)}, ${incident.location.longitude.toFixed(4)}`
            : incident.locationName || 'Location not set'}
        </Text>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Reported</Text>
        <Text style={styles.sectionText}>{formatDate(incident.createdAt || incident.incident_date)}</Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f1f5f9',
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
    color: '#334155',
  },
  badgesRow: {
    alignItems: 'flex-end',
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  sectionCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    color: '#6b7280',
  },
});

export default IncidentDetailScreen;