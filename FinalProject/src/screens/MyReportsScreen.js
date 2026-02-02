import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import incidentConstants from '../../../constants/incident';
import { formatDate } from '../utils/dateUtils';
import useMyReports from '../hooks/useMyReports';
import { Button, Card, SeverityBadge, StatusBadge } from '../components';

const { INCIDENT_CATEGORIES, STATUS_LABELS } = incidentConstants;

const CATEGORY_ICON_MAP = INCIDENT_CATEGORIES.reduce((acc, category) => {
  acc[category.value] = category.icon;
  return acc;
}, {});

const MyReportsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const {
    incidents,
    isLoading,
    isRefreshing,
    selectedFilter,
    setSelectedFilter,
    pagination,
    handleRefresh,
  } = useMyReports({ user });

  /**
   * Handle incident press
   */
  const handleIncidentPress = (incident) => {
    if (incident.isDraft) {
      Alert.alert(
        incident.title,
        'This is a draft report. Continue editing?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue Editing',
            onPress: () => navigation.navigate('ReportIncident', { draft: incident.draftData }),
          },
        ]
      );
      return;
    }

    Alert.alert(
      incident.title,
      `Status: ${STATUS_LABELS[incident.status] || incident.status}\n\n${incident.description}`,
      [
        { text: 'OK' },
        {
          text: 'View Details',
          onPress: () => {
            navigation.navigate('IncidentDetail', { incident });
          },
        },
      ]
    );
  };

  /**
   * Render incident item
   */
  const renderIncidentItem = ({ item }) => {
    const categoryIcon = CATEGORY_ICON_MAP[item.category] || '📝';
    const date = formatDate(item.createdAt);

    const hasLocation = item.location && typeof item.location.latitude === 'number';
    const locationDisplay = hasLocation
      ? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
      : item.locationName || 'Location not set';

    return (
      <TouchableOpacity
        style={styles.incidentCard}
        onPress={() => handleIncidentPress(item)}
        activeOpacity={0.7}
      >
        <Card style={[styles.incidentCardInner, { borderColor: theme.border, borderWidth: 1, borderBottomColor: theme.divider }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: theme.surface }]}>
              <Text style={styles.categoryIcon}>{categoryIcon}</Text>
            </View>
            <View style={styles.badgesRight}>
              {item.severity ? (
                <SeverityBadge severity={item.severity} style={styles.severityBadge} />
              ) : null}
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
              <Text style={[styles.locationText, { color: theme.textSecondary }]}>
                {locationDisplay}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: theme.textTertiary }]}>{date}</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Reports Yet</Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        {selectedFilter === 'all'
          ? "You haven't submitted any incident reports yet."
          : selectedFilter === 'draft'
          ? 'You have no saved drafts.'
          : `You have no ${selectedFilter} reports.`}
      </Text>
      <Button
        title="Report an Incident"
        onPress={() => navigation.navigate('ReportIncident')}
        style={styles.reportButton}
      />
    </View>
  );

  /**
   * Render filter buttons
   */
  const renderFilterButtons = () => {
    const filters = [
      { key: 'all', label: 'All' },
      { key: 'draft', label: 'Drafts' },
      { key: 'submitted', label: 'Submitted' },
      { key: 'in_review', label: 'In Review' },
      { key: 'verified', label: 'Verified' },
      { key: 'published', label: 'Published' },
    ];

    return (
      <View style={[styles.filterContainer, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedFilter === filter.key && [styles.filterButtonActive, { backgroundColor: theme.primary }],
                selectedFilter !== filter.key && { backgroundColor: theme.surface },
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === filter.key ? styles.filterButtonTextActive : { color: theme.text },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your reports...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>My Reports</Text>
        <Text style={styles.headerSubtitle}>
          {pagination ? `${pagination.total} total report${pagination.total !== 1 ? 's' : ''}` : ''}
        </Text>
      </View>

      {/* Filter Buttons */}
      {renderFilterButtons()}

      {/* Incidents List */}
      <FlatList
        data={incidents}
        renderItem={renderIncidentItem}
        keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#1a73e8',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#1a73e8',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  incidentCard: {
    marginBottom: 12,
  },
  incidentCardInner: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
  },
  categoryIcon: {
    fontSize: 20,
  },
  badgesRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    alignSelf: 'flex-end',
  },
  severityBadge: {
    alignSelf: 'flex-end',
  },
  incidentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  incidentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  reportButton: {
    alignSelf: 'center',
    minWidth: 200,
  },
});

export default MyReportsScreen;
