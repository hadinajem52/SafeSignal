import React, { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  TouchableOpacity,
  View } from
'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Card } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import useAreaInsights from '../../hooks/useAreaInsights';
import useDashboardData from '../../hooks/useDashboardData';
import useLocationConsent from '../../hooks/useLocationConsent';
import useNotifications from '../../hooks/useNotifications';
import AreaInsightsCard from './AreaInsightsCard';
import CommunityFeed from './CommunityFeed';
import QuickStatsRow from './QuickStatsRow';
import SafetyScoreCard from './SafetyScoreCard';
import styles from './homeStyles';

const LOCATION_ENABLE_STATUSES = ['disabled', 'permission_denied'];

const normalizeSafetyScore = (safetyScore) => {
  const score = Number(safetyScore?.score);

  if (!safetyScore || !Number.isFinite(score)) {
    return null;
  }

  return {
    ...safetyScore,
    score: Math.max(0, Math.min(100, Math.round(score)))
  };
};

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { enableLocationSharing } = useLocationConsent();
  const [enablingLocation, setEnablingLocation] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  const { unreadCount } = useNotifications();
  const {
    loading,
    refreshing,
    locationLoading,
    location,
    locationStatus,
    locationIssue,
    dashboardData,
    error,
    onRefresh
  } = useDashboardData();
  const { insight: areaInsight, loading: areaInsightLoading } = useAreaInsights();
  const safetyScore = normalizeSafetyScore(dashboardData?.safetyScore);
  const activeNearbyCount = dashboardData?.quickStats?.activeNearby || 0;
  const witnessPrompts = dashboardData?.witnessPrompts || {};
  const witnessPromptCount = witnessPrompts.count || 0;
  const firstNearbyConstellationId = witnessPrompts.firstNearbyConstellationId;
  const showEnableLocationCta =
  !locationLoading &&
  LOCATION_ENABLE_STATUSES.includes(locationStatus);




  const handleEnableLocation = useCallback(async () => {
    if (enablingLocation) return;
    setEnablingLocation(true);
    try {
      const result = await enableLocationSharing();
      if (result.success) {
        showToast('Location enabled. Calculating your area activity…', 'success');
      } else if (result.reason === 'permission_denied') {
        showToast('Location permission is blocked. Enable it in system settings.', 'warning');
        Linking.openSettings().catch(() => {});
      } else {
        showToast(result.error || 'Could not enable location right now.', 'error');
      }
    } finally {
      setEnablingLocation(false);
    }
  }, [enablingLocation, enableLocationSharing, showToast]);
  const safetyScoreUnavailableReason = error ?
  `We could not load safety data right now. ${error}` :
  locationLoading || locationStatus === 'pending' ?
  'Detecting your current location...' :
  locationIssue ?
  locationIssue :
  locationStatus === 'available' ?
  'Reported activity data for your current area is temporarily unavailable from the server.' :
  'Location is temporarily unavailable, so nearby safety cannot be calculated right now.';


  const homeHeader = useMemo(() =>
  <>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <LinearGradient
        colors={[theme.primaryLight || 'rgba(29,78,216,0.14)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}>

          <View>
            <AppText variant="h2" style={[styles.greeting, { color: theme.text }]}>Hello, {user?.username || 'there'}!</AppText>
            <AppText variant="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              Stay informed. Stay safe.
            </AppText>
          </View>
          <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityRole="button"
          accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          style={[styles.logoContainer, { backgroundColor: theme.primary }]}>

            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            {unreadCount > 0 ?
          <View style={[styles.notifBadge, { backgroundColor: theme.error, borderColor: theme.primary }]} /> :
          null}
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {activeNearbyCount > 0 ?
    <Card style={[styles.alertBanner, { backgroundColor: `${theme.warning}18`, borderColor: `${theme.warning}40` }]}>
          <View style={styles.alertBannerRow}>
            <Ionicons name="warning-outline" size={16} color={theme.warning} />
            <AppText variant="bodySmall" style={[styles.alertBannerText, { color: theme.warningNoticeText || theme.warning }]}>
              {activeNearbyCount} active incident{activeNearbyCount > 1 ? 's' : ''} nearby. Review map details now.
            </AppText>
          </View>
        </Card> :
    null}

      <SafetyScoreCard
      safetyScore={safetyScore}
      location={location}
      unavailableReason={safetyScoreUnavailableReason}
      ctaLabel={showEnableLocationCta ? enablingLocation ? 'Enabling…' : 'Enable Location' : undefined}
      onCtaPress={showEnableLocationCta ? handleEnableLocation : undefined} />


      <AreaInsightsCard insight={areaInsight} loading={areaInsightLoading} />

      {witnessPromptCount > 0 && firstNearbyConstellationId ?
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate('WitnessPrompt', {
        constellationId: firstNearbyConstellationId,
        coarseLatitude: witnessPrompts.coarseLatitude,
        coarseLongitude: witnessPrompts.coarseLongitude
      })}>

          <Card style={[styles.witnessPromptCard, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}33` }]}>
            <View style={[styles.witnessPromptIcon, { backgroundColor: `${theme.primary}18` }]}>
              <Ionicons name="radio-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.witnessPromptContent}>
              <AppText variant="label" style={{ color: theme.text }}>
                Help clarify nearby activity
              </AppText>
              <AppText variant="bodySmall" style={[styles.witnessPromptText, { color: theme.textSecondary }]}>
                {witnessPromptCount} private witness prompt{witnessPromptCount > 1 ? 's' : ''} nearby. Share whether you noticed anything.
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.primary} />
          </Card>
        </TouchableOpacity> :
    null}

      <QuickStatsRow
      quickStats={dashboardData?.quickStats}
      onMapPress={() => navigation.navigate('Map')} />


      {error ?
    <Card style={[styles.errorContainer, { backgroundColor: `${theme.error}15` }]}>
          <AppText variant="bodySmall" style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
          <TouchableOpacity onPress={onRefresh}>
            <AppText variant="label" style={[styles.retryText, { color: theme.primary }]}>Tap to retry</AppText>
          </TouchableOpacity>
        </Card> :
    null}
    </>,
  [user, theme, activeNearbyCount, safetyScore, location, safetyScoreUnavailableReason, showEnableLocationCta, enablingLocation, handleEnableLocation, areaInsight, areaInsightLoading, dashboardData, error, onRefresh, navigation, refreshing, witnessPromptCount, firstNearbyConstellationId, witnessPrompts, unreadCount]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.skeletonHeader, { backgroundColor: theme.surface2 }]} />
        <View style={[styles.skeletonCardLarge, { backgroundColor: theme.surface }]} />
        <View style={[styles.skeletonCardMedium, { backgroundColor: theme.surface }]} />
        <View style={styles.skeletonRow}>
          <View style={[styles.skeletonCardSmall, { backgroundColor: theme.surface }]} />
          <View style={[styles.skeletonCardSmall, { backgroundColor: theme.surface }]} />
        </View>
        <View style={[styles.skeletonCardLarge, { backgroundColor: theme.surface }]} />
        <AppText variant="bodySmall" style={[styles.loadingText, { color: theme.textSecondary }]}>
          Building your dashboard...
        </AppText>
      </View>);

  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CommunityFeed
        navigation={navigation}
        ListHeaderComponent={homeHeader}
        externalRefreshing={refreshing}
        onExternalRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 8 }} />

    </View>);

};

export default HomeScreen;