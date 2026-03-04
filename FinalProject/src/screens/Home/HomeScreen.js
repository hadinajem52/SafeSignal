import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Card } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import useDashboardData from '../../hooks/useDashboardData';
import CommunityFeed from './CommunityFeed';
import QuickStatsRow from './QuickStatsRow';
import SafetyScoreCard from './SafetyScoreCard';
import styles from './homeStyles';
import TrendingSection from './TrendingSection';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const {
    loading,
    refreshing,
    locationLoading,
    location,
    locationIssue,
    dashboardData,
    error,
    onRefresh,
  } = useDashboardData();
  const safetyScore = dashboardData?.safetyScore;
  const activeNearbyCount = dashboardData?.quickStats?.activeNearby || 0;
  const locationIssueLower = (locationIssue || '').toLowerCase();
  const showEnableLocationCta =
    !location &&
    !locationLoading &&
    (locationIssueLower.includes('disabled in app preferences') ||
      locationIssueLower.includes('permission'));
  const safetyScoreUnavailableReason = error
    ? `We could not load safety data right now. ${error}`
    : locationLoading
      ? 'Detecting your current location...'
    : locationIssue
      ? locationIssue
      : location
        ? 'Safety data for your current area is temporarily unavailable from the server.'
        : 'Location is temporarily unavailable, so nearby safety cannot be calculated right now.';

  // useMemo must be declared before any early returns (Rules of Hooks)
  const homeHeader = useMemo(() => (
    <>
      <LinearGradient
        colors={[theme.primaryLight || 'rgba(29,78,216,0.14)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { borderColor: theme.border }]}
      >
        <View>
          <AppText variant="h2" style={[styles.greeting, { color: theme.text }]}>Hello, {user?.username || 'there'}!</AppText>
          <AppText variant="body" style={[styles.subtitle, { color: theme.textSecondary }]}> 
            Stay informed. Stay safe.
          </AppText>
        </View>
        <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}> 
          <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
        </View>
      </LinearGradient>

      {activeNearbyCount > 0 ? (
        <Card style={[styles.alertBanner, { backgroundColor: `${theme.warning}18`, borderColor: `${theme.warning}40` }]}> 
          <View style={styles.alertBannerRow}>
            <Ionicons name="warning-outline" size={16} color={theme.warning} />
            <AppText variant="bodySmall" style={[styles.alertBannerText, { color: theme.warningNoticeText || theme.warning }]}> 
              {activeNearbyCount} active incident{activeNearbyCount > 1 ? 's' : ''} nearby. Review map details now.
            </AppText>
          </View>
        </Card>
      ) : null}

      <SafetyScoreCard
        safetyScore={safetyScore}
        location={location}
        unavailableReason={safetyScoreUnavailableReason}
        ctaLabel={showEnableLocationCta ? 'Manage Location' : undefined}
        onCtaPress={showEnableLocationCta ? () => navigation.navigate('Account') : undefined}
      />

      <QuickStatsRow
        quickStats={dashboardData?.quickStats}
        onMapPress={() => navigation.navigate('Map')}
      />

      <TrendingSection trendingCategories={dashboardData?.trendingCategories} />

      {error ? (
        <Card style={[styles.errorContainer, { backgroundColor: `${theme.error}15` }]}>
          <AppText variant="bodySmall" style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
          <TouchableOpacity onPress={onRefresh}>
            <AppText variant="label" style={[styles.retryText, { color: theme.primary }]}>Tap to retry</AppText>
          </TouchableOpacity>
        </Card>
      ) : null}
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [user, theme, activeNearbyCount, safetyScore, location, safetyScoreUnavailableReason, showEnableLocationCta, dashboardData, error, onRefresh, navigation, refreshing]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.skeletonHeader, { backgroundColor: theme.surface2 }]} />
        <View style={[styles.skeletonCardLarge, { backgroundColor: theme.surface }]} />
        <View style={styles.skeletonRow}>
          <View style={[styles.skeletonCardSmall, { backgroundColor: theme.surface }]} />
          <View style={[styles.skeletonCardSmall, { backgroundColor: theme.surface }]} />
        </View>
        <View style={[styles.skeletonCardLarge, { backgroundColor: theme.surface }]} />
        <AppText variant="bodySmall" style={[styles.loadingText, { color: theme.textSecondary }]}>
          Building your dashboard...
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CommunityFeed
        navigation={navigation}
        ListHeaderComponent={homeHeader}
        externalRefreshing={refreshing}
        onExternalRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 8 }}
      />
    </View>
  );
};

export default HomeScreen;
