import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText, SeverityBadge, IncidentIllustration } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import useUserPreferences from '../../hooks/useUserPreferences';
import incidentConstants from '../../../../constants/incident';
import { formatTimeAgo } from '../../utils/dateUtils';
import { DURATION, DISTANCE } from '../../theme/motion';
import FeedCardMedia from './FeedCardMedia';

const { CATEGORY_DISPLAY } = incidentConstants;

const OUTCOME_STYLES = {
  resolved_handled: { label: 'Resolved',     colorKey: 'safetyGood' },
  arrest_made:      { label: 'Arrest Made',  colorKey: 'error'      },
  false_alarm:      { label: 'False Alarm',  colorKey: 'textSecondary' },
  report_filed:     { label: 'Report Filed', colorKey: 'primary'    },
};

const FeedCard = ({ incident, onPress }) => {
  const { theme } = useTheme();
  const { preferences } = useUserPreferences();
  const cat = CATEGORY_DISPLAY[incident.category] || CATEGORY_DISPLAY.other;
  const outcome = OUTCOME_STYLES[incident.closureOutcome] || {
    label: incident.closureOutcome || 'Closed',
    colorKey: 'textSecondary',
  };
  const outcomeColor = theme[outcome.colorKey] || theme.textSecondary;
  const videoUrl = incident.video_url || incident.videoUrl;
  const hasVideo = Boolean(videoUrl);
  const photoUrls = Array.isArray(incident.photo_urls)
    ? incident.photo_urls
    : Array.isArray(incident.photoUrls)
      ? incident.photoUrls
      : [];
  const media = [
    ...photoUrls.filter(Boolean).map((url) => ({ type: 'image', url })),
    ...(videoUrl ? [{ type: 'video', url: videoUrl }] : []),
  ];

  // Whole-card press-scale, shared by the tappable text zones. The media block
  // is intentionally OUTSIDE these zones: a tap on a photo/video drives the
  // carousel / inline player and must not scale the card or open the detail
  // screen. (Nesting media inside the card Pressable made the two fight for the
  // touch — the card ate the press feedback and the video tap did nothing.)
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * (1 - DISTANCE.press) }],
    opacity: 1 - pressed.value * 0.05,
  }));
  const onPressIn = () => {
    pressed.value = withTiming(1, { duration: DURATION.micro });
  };
  const onPressOut = () => {
    pressed.value = withTiming(0, { duration: DURATION.micro });
  };
  const openDetail = () => onPress?.(incident);

  return (
    <Animated.View entering={FadeIn.duration(DURATION.base)}>
      <Animated.View
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, cardStyle]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={openDetail}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          {/* Category + Severity row */}
          <View style={styles.topRow}>
            <View style={[styles.categoryChip, { backgroundColor: `${cat.mapColor}22` }]}>
              <Ionicons name={cat.mapIcon} size={13} color={cat.mapColor} />
              <AppText variant="caption" style={{ color: cat.mapColor, marginLeft: 4 }}>
                {cat.label}
              </AppText>
            </View>
            <SeverityBadge severity={incident.severity} />
          </View>

          {/* Title */}
          <AppText
            variant="body"
            style={[styles.title, { color: theme.text }]}
            numberOfLines={2}
          >
            {incident.title}
          </AppText>
        </Pressable>

        {/* Media (Instagram-style) when present, else the category illustration.
            Media owns its own touches (carousel swipe + inline video playback). */}
        {media.length > 0 ? (
          <FeedCardMedia media={media} autoplay={preferences.feedVideoAutoplay} />
        ) : (
          <Pressable
            accessibilityRole="button"
            style={styles.illustrationWrap}
            onPress={openDetail}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          >
            <IncidentIllustration category={incident.category} size={150} />
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={openDetail}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          {/* Outcome + meta row */}
          <View style={styles.metaRow}>
            <View style={styles.mediaStatusRow}>
              <View style={[styles.outcomePill, { backgroundColor: `${outcomeColor}22` }]}>
                <AppText variant="caption" style={{ color: outcomeColor }}>
                  {outcome.label}
                </AppText>
              </View>
              {hasVideo ? (
                <View style={[styles.videoPill, { backgroundColor: `${theme.primary}18` }]}>
                  <Ionicons name="videocam-outline" size={11} color={theme.primary} />
                  <AppText variant="caption" style={{ color: theme.primary, marginLeft: 3 }}>
                    Video
                  </AppText>
                </View>
              ) : null}
            </View>
            <View style={styles.metaRight}>
              <View style={styles.statusRow}>
                <Ionicons name="shield-checkmark-outline" size={11} color={theme.textSecondary} />
                <AppText variant="caption" style={[styles.metaText, { color: theme.textSecondary }]}>
                  Closed by Law Enforcement
                </AppText>
              </View>
              <AppText variant="caption" style={{ color: theme.textSecondary }}>
                {formatTimeAgo(incident.closedAt)}
              </AppText>
            </View>
          </View>

          {/* Location */}
          {incident.locationName ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={11} color={theme.textSecondary} />
              <AppText
                variant="caption"
                style={[styles.locationText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {incident.locationName}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  title: {
    marginBottom: 10,
    lineHeight: 20,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  outcomePill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  videoPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  metaRight: {
    alignItems: 'flex-end',
  },
  metaText: {
    marginLeft: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  locationText: {
    marginLeft: 3,
  },
});

export default React.memo(FeedCard);
