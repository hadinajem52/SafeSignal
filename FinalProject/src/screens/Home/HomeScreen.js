import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText, Card } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useDashboardData from '../../hooks/useDashboardData';
import ContributionsGrid from './ContributionsGrid';
import QuickActions from './QuickActions';
import QuickStatsRow from './QuickStatsRow';
import RecentActivity from './RecentActivity';
import SafetyScoreCard from './SafetyScoreCard';
import styles from './homeStyles';
import TrendingSection from './TrendingSection';

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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <AppText variant="body" style={[styles.loadingText, { color: theme.textSecondary }]}>Loading dashboard...</AppText>
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
      <View style={styles.header}>
        <View>
          <AppText variant="h3" style={[styles.greeting, { color: theme.text }]}>Hello, {user?.username}! 👋</AppText>
          <AppText variant="body" style={[styles.subtitle, { color: theme.textSecondary }]}>Stay informed, stay safe</AppText>
        </View>
        <View style={[styles.logoContainer, { backgroundColor: `${theme.primary}15` }]}>
          <AppText style={styles.logo}>🛡️</AppText>
        </View>
      </View>

      <SafetyScoreCard safetyScore={dashboardData?.safetyScore} location={location} />

      <QuickStatsRow
        quickStats={dashboardData?.quickStats}
        onMapPress={() => navigation.navigate('Map')}
      />

      <TrendingSection trendingCategories={dashboardData?.trendingCategories} />

      <ContributionsGrid userStats={dashboardData?.userStats} />

      <QuickActions navigation={navigation} />

      <RecentActivity
        recentActivity={dashboardData?.recentActivity}
        onPress={() => navigation.navigate('Reports')}
      />

      {error ? (
        <Card style={[styles.errorContainer, { backgroundColor: `${theme.error}15` }]}>
          <AppText variant="bodySmall" style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
          <TouchableOpacity onPress={onRefresh}>
            <AppText variant="label" style={[styles.retryText, { color: theme.primary }]}>Tap to retry</AppText>
          </TouchableOpacity>
        </Card>
      ) : null}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

export default HomeScreen;
