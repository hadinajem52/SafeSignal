import React from 'react';
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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import incidentConstants from '../../../constants/incident';
import useDashboardData from '../hooks/useDashboardData';
import { Card } from '../components';

const { width } = Dimensions.get('window');

const { CATEGORY_DISPLAY } = incidentConstants;

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const {
    loading,
    refreshing,
    location,
    dashboardData,
    error,
    onRefresh,
  } = useDashboardData();

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
    return CATEGORY_DISPLAY[category]?.label || category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.text }]}>Hello, {user?.username}! 👋</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Stay informed, stay safe</Text>
        </View>
        <View style={[styles.logoContainer, { backgroundColor: `${theme.primary}15` }]}>
          <Text style={styles.logo}>🛡️</Text>
        </View>
      </View>

      {/* Safety Score Card */}
      {dashboardData?.safetyScore && (
        <Card style={[styles.safetyCard, { borderLeftColor: getSafetyScoreColor(dashboardData.safetyScore.score) }]}>
          <View style={styles.safetyHeader}>
            <Text style={[styles.safetyTitle, { color: theme.text }]}>Area Safety Score</Text>
            {location && <Text style={[styles.locationBadge, { color: theme.textSecondary, backgroundColor: theme.surface }]}>📍 Your Location</Text>}
          </View>
          <View style={styles.safetyContent}>
            <View style={[styles.scoreCircle, { backgroundColor: theme.surface }]}>
              <Text style={[styles.scoreNumber, { color: getSafetyScoreColor(dashboardData.safetyScore.score) }]}>
                {dashboardData.safetyScore.score}
              </Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>{dashboardData.safetyScore.label}</Text>
            </View>
            <View style={styles.safetyInfo}>
              <Text style={[styles.safetyDescription, { color: theme.text }]}>{dashboardData.safetyScore.description}</Text>
              <Text style={[styles.safetyNote, { color: theme.textTertiary }]}>Based on incidents within 5km radius</Text>
            </View>
          </View>
        </Card>
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📈 Trending This Week</Text>
          <Card style={styles.trendingContainer}>
            {dashboardData.trendingCategories.map((cat, index) => {
              const config = CATEGORY_DISPLAY[cat.category] || CATEGORY_DISPLAY.other;
              return (
                <View key={index} style={styles.trendingItem}>
                  <View style={[styles.trendingIcon, { backgroundColor: `${config.trendColor}15` }]}>
                    <Text style={styles.trendingEmoji}>{config.trendIcon}</Text>
                  </View>
                  <View style={styles.trendingInfo}>
                    <Text style={[styles.trendingCategory, { color: theme.text }]}>{formatCategoryName(cat.category)}</Text>
                    <Text style={[styles.trendingCount, { color: theme.textSecondary }]}>{cat.count} reports</Text>
                  </View>
                  <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor(cat.changePercentage)}15` }]}>
                    <Text style={[styles.trendText, { color: getTrendColor(cat.changePercentage) }]}>
                      {getTrendIcon(cat.changePercentage)} {Math.abs(cat.changePercentage)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      )}

      {/* Your Contributions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Your Contributions</Text>
        <Card style={styles.contributionsGrid}>
          <View style={styles.contributionCard}>
            <Text style={[styles.contributionNumber, { color: theme.text }]}>{dashboardData?.userStats?.totalReports || 0}</Text>
            <Text style={[styles.contributionLabel, { color: theme.textSecondary }]}>Total{'\n'}Reports</Text>
          </View>
          <View style={styles.contributionCard}>
            <Text style={[styles.contributionNumber, { color: '#27ae60' }]}>
              {dashboardData?.userStats?.verifiedReports || 0}
            </Text>
            <Text style={[styles.contributionLabel, { color: theme.textSecondary }]}>Verified</Text>
          </View>
          <View style={styles.contributionCard}>
            <Text style={[styles.contributionNumber, { color: '#3498db' }]}>
              {dashboardData?.userStats?.resolvedReports || 0}
            </Text>
            <Text style={[styles.contributionLabel, { color: theme.textSecondary }]}>Resolved</Text>
          </View>
          <View style={styles.contributionCard}>
            <Text style={[styles.contributionNumber, { color: '#f39c12' }]}>
              {dashboardData?.userStats?.pendingReports || 0}
            </Text>
            <Text style={[styles.contributionLabel, { color: theme.textSecondary }]}>Pending</Text>
          </View>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>⚡ Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ReportIncident')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#e74c3c15' }]}>
              <Text style={styles.actionIcon}>📝</Text>
            </View>
            <Text style={[styles.actionText, { color: theme.text }]}>Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Map')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#3498db15' }]}>
              <Text style={styles.actionIcon}>🗺️</Text>
            </View>
            <Text style={[styles.actionText, { color: theme.text }]}>Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Reports')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#9b59b615' }]}>
              <Text style={styles.actionIcon}>📊</Text>
            </View>
            <Text style={[styles.actionText, { color: theme.text }]}>My Reports</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Account')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#1abc9c15' }]}>
              <Text style={styles.actionIcon}>👤</Text>
            </View>
            <Text style={[styles.actionText, { color: theme.text }]}>Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      {dashboardData?.recentActivity?.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🕐 Recent Activity</Text>
          <Card style={styles.activityContainer}>
            {dashboardData.recentActivity.slice(0, 3).map((activity, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.activityItem}
                onPress={() => navigation.navigate('Reports')}
              >
                <View style={styles.activityDot} />
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>
                    {activity.incidentTitle}
                  </Text>
                  <Text style={[styles.activityType, { color: theme.textSecondary }]}>
                    {activity.type.replace(/_/g, ' ')}
                  </Text>
                </View>
                <Text style={[styles.activityTime, { color: theme.textTertiary }]}>
                  {new Date(activity.timestamp).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <Card style={[styles.errorContainer, { backgroundColor: `${theme.statusError}15` }]}>
          <Text style={[styles.errorText, { color: theme.statusError }]}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Tap to retry</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
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
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
  },
  safetyCard: {
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
  },
  locationBadge: {
    fontSize: 12,
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
    marginTop: 2,
  },
  safetyInfo: {
    flex: 1,
  },
  safetyDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  safetyNote: {
    fontSize: 12,
    marginTop: 8,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickStatCard: {
    flex: 1,
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
  },
  quickStatLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  trendingContainer: {
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
  },
  trendingCount: {
    fontSize: 12,
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
  },
  contributionLabel: {
    fontSize: 11,
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
    fontWeight: '500',
  },
  activityContainer: {
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
  },
  activityType: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  activityTime: {
    fontSize: 11,
  },
  errorContainer: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
  },
  errorText: {
    fontSize: 14,
  },
  retryText: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default HomeScreen;
