import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '../../components';
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
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.text }]}>Hello, {user?.username}! 👋</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Stay informed, stay safe</Text>
        </View>
        <View style={[styles.logoContainer, { backgroundColor: `${theme.primary}15` }]}>
          <Text style={styles.logo}>🛡️</Text>
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
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Tap to retry</Text>
          </TouchableOpacity>
        </Card>
      ) : null}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

export default HomeScreen;
