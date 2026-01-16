import React, { useState, useEffect, useCallback } from 'react';
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
import { incidentAPI } from '../services/api';

// Status badge colors
const STATUS_COLORS = {
  submitted: '#6c757d',
  auto_processed: '#17a2b8',
  in_review: '#ffc107',
  verified: '#28a745',
  rejected: '#dc3545',
  needs_info: '#fd7e14',
  published: '#007bff',
  resolved: '#20c997',
  archived: '#6c757d',
  auto_flagged: '#e83e8c',
  merged: '#6610f2',
};

const STATUS_LABELS = {
  submitted: 'Submitted',
  auto_processed: 'Processing',
  in_review: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
  needs_info: 'Needs Info',
  published: 'Published',
  resolved: 'Resolved',
  archived: 'Archived',
  auto_flagged: 'Flagged',
  merged: 'Merged',
};

const CATEGORY_ICONS = {
  theft: '💰',
  assault: '⚠️',
  vandalism: '🔨',
  burglary: '🏠',
  harassment: '😠',
  suspicious_activity: '👀',
  traffic_incident: '🚗',
  public_disturbance: '📢',
  other: '📝',
};

const MyReportsScreen = ({ navigation }) => {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [pagination, setPagination] = useState(null);

  /**
   * Fetch incidents from API
   */
  const fetchIncidents = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const params = selectedFilter !== 'all' ? { status: selectedFilter } : {};
      const result = await incidentAPI.getMyIncidents(params);

      if (result.success) {
        setIncidents(result.incidents);
        setPagination(result.pagination);
      } else {
        Alert.alert('Error', result.error || 'Failed to load incidents');
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFilter]);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchIncidents(false);
  };

  /**
   * Handle incident press
   */
  const handleIncidentPress = (incident) => {
    Alert.alert(
      incident.title,
      `Status: ${STATUS_LABELS[incident.status] || incident.status}\n\n${incident.description}`,
      [
        { text: 'OK' },
        {
          text: 'View Details',
          onPress: () => {
            // TODO: Navigate to incident detail screen when created
            console.log('View incident:', incident.id);
          },
        },
      ]
    );
  };

  /**
   * Render incident item
   */
  const renderIncidentItem = ({ item }) => {
    const categoryIcon = CATEGORY_ICONS[item.category] || '📝';
    const statusColor = STATUS_COLORS[item.status] || '#6c757d';
    const statusLabel = STATUS_LABELS[item.status] || item.status;
    const date = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.incidentCard}
        onPress={() => handleIncidentPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryIcon}>{categoryIcon}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={styles.incidentTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.incidentDescription} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
            </Text>
          </View>
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>No Reports Yet</Text>
      <Text style={styles.emptyText}>
        {selectedFilter === 'all'
          ? "You haven't submitted any incident reports yet."
          : `You have no ${selectedFilter} reports.`}
      </Text>
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => navigation.navigate('ReportIncident')}
      >
        <Text style={styles.reportButtonText}>Report an Incident</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render filter buttons
   */
  const renderFilterButtons = () => {
    const filters = [
      { key: 'all', label: 'All' },
      { key: 'submitted', label: 'Submitted' },
      { key: 'in_review', label: 'In Review' },
      { key: 'verified', label: 'Verified' },
      { key: 'published', label: 'Published' },
    ];

    return (
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedFilter === filter.key && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === filter.key && styles.filterButtonTextActive,
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading your reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
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
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1a73e8']}
            tintColor="#1a73e8"
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
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: '#1a73e8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MyReportsScreen;
