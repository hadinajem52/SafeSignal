import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { statsAPI } from '../services/api';

const { width } = Dimensions.get('window');

// Category icons and colors mapping
const CATEGORY_CONFIG = {
  theft: { icon: '🔓', color: '#e74c3c' },
  vandalism: { icon: '🔨', color: '#e67e22' },
  assault: { icon: '⚠️', color: '#c0392b' },
  suspicious_activity: { icon: '👁️', color: '#9b59b6' },
  traffic: { icon: '🚗', color: '#3498db' },
  noise: { icon: '🔊', color: '#1abc9c' },
  fire: { icon: '🔥', color: '#e74c3c' },
  medical: { icon: '🏥', color: '#e91e63' },
  other: { icon: '📋', color: '#95a5a6' },
};

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async (coords = null) => {
    try {
      setError(null);
      const params = coords 
        ? { latitude: coords.latitude, longitude: coords.longitude, radius: 5 }
        : {};
      
      const result = await statsAPI.getDashboardStats(params);
      
      if (result.success) {
        setDashboardData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc.coords);
        await fetchDashboardData(loc.coords);
      } else {
        // Fetch without location
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Location error:', err);
      await fetchDashboardData();
    } finally {
      setLoading(false);
    }
  }, [fetchDashboardData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getSafetyScoreColor = (score) => {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    return '#e74c3c';
  };

  const getTrendIcon = (change) => {
    if (change > 0) return '↑';
    if (change < 0) return '↓';
    return '→';
  };

  const getTrendColor = (change) => {
    if (change > 0) return '#e74c3c';
    if (change < 0) return '#27ae60';
    return '#95a5a6';
  };

  const formatCategoryName = (category) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error && !dashboardData) {
    return (
      <View style={styles.errorScreenContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a73e8']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.username}! 👋</Text>
          <Text style={styles.subtitle}>Stay informed, stay safe</Text>
        </View>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🛡️</Text>
        </View>
      </View>

      {/* Safety Score Card */}
      {dashboardData?.safetyScore && (
        <View style={[styles.safetyCard, { borderLeftColor: getSafetyScoreColor(dashboardData.safetyScore.score) }]}>
          <View style={styles.safetyHeader}>
            <Text style={styles.safetyTitle}>Area Safety Score</Text>
            {location && <Text style={styles.locationBadge}>📍 Your Location</Text>}
          </View>
          <View style={styles.safetyContent}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreNumber, { color: getSafetyScoreColor(dashboardData.safetyScore.score) }]}>
                {dashboardData.safetyScore.score}
              </Text>
              <Text style={styles.scoreLabel}>{dashboardData.safetyScore.label}</Text>
            </View>
            <View style={styles.safetyInfo}>
              <Text style={styles.safetyDescription}>{dashboardData.safetyScore.description}</Text>
              <Text style={styles.safetyNote}>Based on incidents within 5km radius</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Stats Cards */}
      <View style={styles.quickStatsRow}>
        <TouchableOpacity 
          style={[styles.quickStatCard, styles.activeCard]}
          onPress={() => navigation.navigate('Map')}
        >
          <Text style={styles.quickStatIcon}>🚨</Text>
          <Text style={styles.quickStatNumber}>{dashboardData?.quickStats?.activeNearby || 0}</Text>
          <Text style={styles.quickStatLabel}>Active{'\n'}Nearby</Text>
        </TouchableOpacity>
        
        <View style={[styles.quickStatCard, styles.resolvedCard]}>
          <Text style={styles.quickStatIcon}>✅</Text>
          <Text style={styles.quickStatNumber}>{dashboardData?.quickStats?.resolvedThisWeek || 0}</Text>
          <Text style={styles.quickStatLabel}>Resolved{'\n'}This Week</Text>
        </View>
      </View>

      {/* Trending Categories */}
      {dashboardData?.trendingCategories?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Trending This Week</Text>
          <View style={styles.trendingContainer}>
            {dashboardData.trendingCategories.map((cat, index) => {
              const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.other;
              return (
                <View key={index} style={styles.trendingItem}>
                  <View style={[styles.trendingIcon, { backgroundColor: `${config.color}15` }]}>
                    <Text style={styles.trendingEmoji}>{config.icon}</Text>
                  </View>
                  <View style={styles.trendingInfo}>
                    <Text style={styles.trendingCategory}>{formatCategoryName(cat.category)}</Text>
                    <Text style={styles.trendingCount}>{cat.count} reports</Text>
                  </View>
                  <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor(cat.changePercentage)}15` }]}>
                    <Text style={[styles.trendText, { color: getTrendColor(cat.changePercentage) }]}>
                      {getTrendIcon(cat.changePercentage)} {Math.abs(cat.changePercentage)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Your Contributions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Your Contributions</Text>
        <View style={styles.contributionsGrid}>
          <View style={styles.contributionCard}>
            <Text style={styles.contributionNumber}>{dashboardData?.userStats?.totalReports || 0}</Text>
            <Text style={styles.contributionLabel}>Total{'\n'}Reports</Text>
          </View>
          <View style={styles.contributionCard}>
            <Text style={[styles.contributionNumber, { color: '#27ae60' }]}>
              {dashboardData?.userStats?.verifiedReports || 0}
            </Text>
            <Text style={styles.contributionLabel}>Verified</Text>
          </View>
          <View style={styles.contributionCard}>
            <Text style={[styles.contributionNumber, { color: '#3498db' }]}>
              {dashboardData?.userStats?.resolvedReports || 0}
            </Text>
            <Text style={styles.contributionLabel}>Resolved</Text>
          </View>
          <View style={styles.contributionCard}>
            <Text style={[styles.contributionNumber, { color: '#f39c12' }]}>
              {dashboardData?.userStats?.pendingReports || 0}
            </Text>
            <Text style={styles.contributionLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ReportIncident')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#e74c3c15' }]}>
              <Text style={styles.actionIcon}>📝</Text>
            </View>
            <Text style={styles.actionText}>Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Map')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#3498db15' }]}>
              <Text style={styles.actionIcon}>🗺️</Text>
            </View>
            <Text style={styles.actionText}>Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('MyReports')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#9b59b615' }]}>
              <Text style={styles.actionIcon}>📊</Text>
            </View>
            <Text style={styles.actionText}>My Reports</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Account')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#1abc9c15' }]}>
              <Text style={styles.actionIcon}>👤</Text>
            </View>
            <Text style={styles.actionText}>Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      {dashboardData?.recentActivity?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Recent Activity</Text>
          <View style={styles.activityContainer}>
            {dashboardData.recentActivity.slice(0, 3).map((activity, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.activityItem}
                onPress={() => navigation.navigate('MyReports')}
              >
                <View style={styles.activityDot} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {activity.incidentTitle}
                  </Text>
                  <Text style={styles.activityType}>
                    {activity.type.replace(/_/g, ' ')}
                  </Text>
                </View>
                <Text style={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  errorContent: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a73e815',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
  },
  safetyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  safetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  locationBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  safetyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f7fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  safetyInfo: {
    flex: 1,
  },
  safetyDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  safetyNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  activeCard: {
    borderTopWidth: 3,
    borderTopColor: '#e74c3c',
  },
  resolvedCard: {
    borderTopWidth: 3,
    borderTopColor: '#27ae60',
  },
  quickStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  trendingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trendingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trendingEmoji: {
    fontSize: 20,
  },
  trendingInfo: {
    flex: 1,
  },
  trendingCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  trendingCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contributionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  contributionCard: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  contributionNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  contributionLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    width: (width - 64) / 4,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  activityContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a73e8',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  activityType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#c0392b',
  },
  errorText: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '500',
  },
  retryText: {
    color: '#1a73e8',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default HomeScreen;
