import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import incidentConstants from '../../../constants/incident';
import { formatDate } from '../utils/dateUtils';
import {
  AppText,
  SeverityBadge,
  StatusBadge,
  IncidentChatFab,
  IncidentVideoPlayer,
  IncidentIllustration,
  IncidentLocationMap,
  IncidentStatusTracker,
  FadeInImage,
} from '../components';
import { normalizeClosureDetails } from '../utils/incidentUtils';
import { resolveMediaUrl } from '../utils/mediaUtils';
import { useTheme } from '../context/ThemeContext';
import { incidentAPI } from '../services/api';
import { haptics } from '../utils/haptics';
import { DURATION } from '../theme/motion';
import styles from './incidentDetailStyles';

const { CATEGORY_DISPLAY, STATUS_LABELS } = incidentConstants;

const getIncidentId = (incident) => incident?.incident_id || incident?.id;

const getConstellationCopy = (constellation) => {
  if (!constellation) {
    return null;
  }

  if (constellation.status === 'flagged') {
    return {
      title: 'Under review',
      body: 'Nearby witness activity is being reviewed before more detail is shown.',
    };
  }

  return {
    title: 'Nearby witness signal',
    body: constellation.summary || 'Awaiting nearby responses from eligible witnesses.',
  };
};

// Defined at module scope (not inside the screen) so they aren't remounted on every
// screen re-render, e.g. when toggling the fullscreen photo. They read theme directly.
const Divider = () => {
  const { theme } = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
};

const SectionHeader = ({ icon, color, title, subtitle }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label" style={{ color: theme.text }}>{title}</AppText>
        {subtitle ? (
          <AppText variant="small" style={{ color: theme.textTertiary, marginTop: 1 }}>{subtitle}</AppText>
        ) : null}
      </View>
    </View>
  );
};

const IncidentDetailScreen = ({ route, navigation }) => {
  const { incident, source } = route.params || {};
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [detailIncident, setDetailIncident] = useState(incident || null);
  const [loadingDetail, setLoadingDetail] = useState(Boolean(getIncidentId(incident)));
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);

  useEffect(() => {
    let active = true;
    const incidentId = getIncidentId(incident);

    if (!incidentId) {
      setLoadingDetail(false);
      return undefined;
    }

    const loadIncident = async () => {
      const result = await incidentAPI.getIncidentById(incidentId);
      if (!active) {
        return;
      }
      if (result.success) {
        setDetailIncident(result.incident);
      }
      setLoadingDetail(false);
    };

    loadIncident();

    return () => {
      active = false;
    };
  }, [incident]);

  if (!detailIncident) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.card, paddingTop: insets.top }]}>
        <AppText variant="body" style={{ color: theme.textSecondary }}>Incident details not available.</AppText>
      </View>
    );
  }

  const categoryConfig = CATEGORY_DISPLAY[detailIncident.category] || CATEGORY_DISPLAY.other;
  const accent = categoryConfig.mapColor || theme.primary;
  const displayStatus = detailIncident.status === 'police_closed' ? 'resolved' : detailIncident.status;
  const latitude = Number(detailIncident?.location?.latitude || detailIncident?.latitude);
  const longitude = Number(detailIncident?.location?.longitude || detailIncident?.longitude);
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const reportedAtRaw = detailIncident.createdAt || detailIncident.created_at || detailIncident.incident_date || detailIncident.closedAt;
  const reportedAtDate = reportedAtRaw ? new Date(reportedAtRaw) : null;
  const reportedAtLabel =
    reportedAtDate && !Number.isNaN(reportedAtDate.getTime())
      ? formatDate(reportedAtDate)
      : 'Date unavailable';
  const closureOutcomeValue = detailIncident.closure_outcome || detailIncident.closureOutcome;
  const closureOutcome = closureOutcomeValue
    ? closureOutcomeValue.replace(/_/g, ' ')
    : null;
  const rawClosureDetails = detailIncident.closure_details || detailIncident.closureDetails;
  const closureDetails = normalizeClosureDetails(rawClosureDetails);
  const description = detailIncident.description || closureDetails || 'No description available.';
  const locationLabel = detailIncident.locationName || detailIncident.location_name || 'Location not set';
  const placeName = detailIncident.locationName || detailIncident.location_name || '';
  // Coordinates already arrive fuzzed-or-exact (decided server-side). If the fuzz
  // flag is present, show an approximate-area circle instead of a precise pin.
  const isApproximateLocation = Boolean(
    detailIncident?.is_location_fuzzed ?? detailIncident?.isLocationFuzzed,
  );
  const showTimeline = source !== 'community_feed';
  const constellationCopy = getConstellationCopy(detailIncident.constellation);
  const isFlagged = detailIncident.constellation?.status === 'flagged';
  const videoUrl = detailIncident.video_url || detailIncident.videoUrl;
  const photoUrls = Array.isArray(detailIncident.photo_urls)
    ? detailIncident.photo_urls
    : Array.isArray(detailIncident.photoUrls)
      ? detailIncident.photoUrls
      : [];

  return (
    <View style={[styles.screenWrapper, { backgroundColor: theme.card, paddingTop: insets.top }]}>
      <View style={[styles.backHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            haptics.selection();
            navigation.goBack();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
          <AppText variant="body" style={{ color: theme.text }}>Back</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(DURATION.page)}>
          {/* ---- Hero ---- */}
          <LinearGradient
            colors={[`${accent}2E`, `${accent}0F`, theme.card]}
            locations={[0, 0.5, 1]}
            style={styles.heroGradient}
          >
            <View style={styles.medallion}>
              <IncidentIllustration category={detailIncident.category} size={146} />
            </View>

            <View style={styles.heroBadgesRow}>
              <View style={[styles.categoryChip, { backgroundColor: `${accent}1F`, borderColor: `${accent}33` }]}>
                <Ionicons name={categoryConfig.mapIcon || 'help-circle-outline'} size={13} color={accent} />
                <AppText variant="caption" style={{ color: accent, marginLeft: 5 }}>{categoryConfig.label}</AppText>
              </View>
              {detailIncident.severity ? <SeverityBadge severity={detailIncident.severity} /> : null}
              <StatusBadge status={displayStatus} />
            </View>

            <AppText variant="h2" style={[styles.heroTitle, { color: theme.text }]}>{detailIncident.title}</AppText>

            {closureOutcome ? (
              <View style={[styles.outcomePill, { backgroundColor: `${theme.success}1A`, borderColor: `${theme.success}40` }]}>
                <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                <AppText variant="caption" style={{ color: theme.success, textTransform: 'capitalize' }}>{closureOutcome}</AppText>
              </View>
            ) : null}

            <View style={[styles.heroMetaRow, { borderTopColor: theme.border }]}>
              <Ionicons name="time-outline" size={14} color={theme.textTertiary} />
              <AppText variant="caption" style={{ color: theme.textSecondary }}>{reportedAtLabel}</AppText>
            </View>

            {loadingDetail ? <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} /> : null}
          </LinearGradient>

          {/* ---- Status workflow ---- */}
          {showTimeline ? (
            <>
              <Divider />
              <View style={styles.section}>
                <SectionHeader
                  icon="git-commit-outline"
                  color={theme.info}
                  title="Status"
                  subtitle={STATUS_LABELS[displayStatus] || 'Tracking progress'}
                />
                <IncidentStatusTracker status={detailIncident.status} />
              </View>
            </>
          ) : null}

          {/* ---- Description ---- */}
          <Divider />
          <View style={styles.section}>
            <SectionHeader icon="document-text-outline" color={theme.primary} title="Description" />
            <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{description}</AppText>
          </View>

          {/* ---- Video evidence ---- */}
          {videoUrl ? (
            <>
              <Divider />
              <View style={styles.section}>
                <SectionHeader icon="videocam-outline" color={theme.accentPurple} title="Video Evidence" />
                <IncidentVideoPlayer videoUrl={videoUrl} />
              </View>
            </>
          ) : null}

          {/* ---- Photo evidence ---- */}
          {photoUrls.length > 0 ? (
            <>
              <Divider />
              <View style={styles.section}>
                <SectionHeader
                  icon="image-outline"
                  color={theme.info}
                  title={photoUrls.length > 1 ? `Photo Evidence (${photoUrls.length})` : 'Photo Evidence'}
                />
                <View style={{ gap: 10 }}>
                  {photoUrls.filter(Boolean).map((url, i) => (
                    <Pressable
                      key={`${url}-${i}`}
                      onPress={() => setFullscreenPhoto(resolveMediaUrl(url))}
                      style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: theme.surface }}
                    >
                      <FadeInImage
                        source={{ uri: resolveMediaUrl(url) }}
                        style={{ width: '100%', height: 240 }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : null}

          {/* ---- Nearby witness signal ---- */}
          {constellationCopy ? (
            <>
              <Divider />
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrap, { backgroundColor: isFlagged ? `${theme.warning}1A` : `${theme.primary}1A` }]}>
                    <Ionicons
                      name={isFlagged ? 'shield-outline' : 'radio-outline'}
                      size={17}
                      color={isFlagged ? theme.warning : theme.primary}
                    />
                  </View>
                  <AppText variant="label" style={{ color: theme.text, flex: 1 }}>{constellationCopy.title}</AppText>
                </View>
                <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{constellationCopy.body}</AppText>
              </View>
            </>
          ) : null}

          {/* ---- Closure details ---- */}
          {closureDetails ? (
            <>
              <Divider />
              <View style={styles.section}>
                <SectionHeader icon="checkmark-done-outline" color={theme.success} title="Closure Details" />
                <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{closureDetails}</AppText>
              </View>
            </>
          ) : null}

          {/* ---- Location ---- */}
          <Divider />
          <View style={styles.section}>
            <SectionHeader icon="location-outline" color={accent} title="Location" />
            {hasValidCoordinates ? (
              <>
                <IncidentLocationMap
                  latitude={latitude}
                  longitude={longitude}
                  color={categoryConfig.mapColor}
                  approximate={isApproximateLocation}
                />
                {(placeName || isApproximateLocation) ? (
                  <View style={styles.placeChip}>
                    <Ionicons
                      name={isApproximateLocation ? 'navigate-circle-outline' : 'pin-outline'}
                      size={13}
                      color={theme.textTertiary}
                    />
                    <AppText variant="caption" style={{ color: theme.textSecondary, flex: 1 }}>
                      {placeName}{placeName && isApproximateLocation ? ' · ' : ''}{isApproximateLocation ? 'Approximate area' : ''}
                    </AppText>
                  </View>
                ) : null}
              </>
            ) : (
              <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>
                {locationLabel}
              </AppText>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      {showTimeline ? (
        <IncidentChatFab incidentId={getIncidentId(detailIncident)} accent={accent} />
      ) : null}

      <Modal
        visible={Boolean(fullscreenPhoto)}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenPhoto(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setFullscreenPhoto(null)}
        >
          {fullscreenPhoto ? (
            <ExpoImage
              source={{ uri: fullscreenPhoto }}
              style={{ width: '100%', height: '82%' }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : null}
          <Pressable
            onPress={() => setFullscreenPhoto(null)}
            hitSlop={12}
            style={{ position: 'absolute', top: insets.top + 12, right: 16, padding: 8 }}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default IncidentDetailScreen;
