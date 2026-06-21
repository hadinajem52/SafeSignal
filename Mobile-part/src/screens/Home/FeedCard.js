import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, SeverityBadge, IncidentIllustration } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import useUserPreferences from '../../hooks/useUserPreferences';
import incidentConstants from '../../../../constants/incident';
import { formatTimeAgo } from '../../utils/dateUtils';
import FeedCardMedia from './FeedCardMedia';

const { CATEGORY_DISPLAY } = incidentConstants;

const OUTCOME_STYLES = {
  resolved_handled: { label: 'Resolved', colorKey: 'safetyGood' },
  arrest_made: { label: 'Arrest Made', colorKey: 'error' },
  false_alarm: { label: 'False Alarm', colorKey: 'textSecondary' },
  report_filed: { label: 'Report Filed', colorKey: 'primary' }
};

const FeedCard = ({ incident, onPress }) => {
  const { theme } = useTheme();
  const { preferences } = useUserPreferences();
  const [showCorroborationHint, setShowCorroborationHint] = useState(false);
  const cat = CATEGORY_DISPLAY[incident.category] || CATEGORY_DISPLAY.other;
  const outcome = OUTCOME_STYLES[incident.closureOutcome] || {
    label: incident.closureOutcome || 'Closed',
    colorKey: 'textSecondary'
  };
  const outcomeColor = theme[outcome.colorKey] || theme.textSecondary;
  const videoUrl = incident.video_url || incident.videoUrl;
  const hasVideo = Boolean(videoUrl);
  const corroborationCount = incident.corroborationCount || 0;
  const photoUrls = Array.isArray(incident.photo_urls) ?
  incident.photo_urls :
  Array.isArray(incident.photoUrls) ?
  incident.photoUrls :
  [];
  const media = [
  ...photoUrls.filter(Boolean).map((url) => ({ type: 'image', url })),
  ...(videoUrl ? [{ type: 'video', url: videoUrl }] : [])];

  const openDetail = () => onPress?.(incident);
  const showSeenHint = (event) => {
    event.stopPropagation?.();
    setShowCorroborationHint(true);
  };

  useEffect(() => {
    if (!showCorroborationHint) {
      return undefined;
    }

    const timer = setTimeout(() => setShowCorroborationHint(false), 2600);
    return () => clearTimeout(timer);
  }, [showCorroborationHint]);

  return (
    <View
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={openDetail}
      >
          <View style={styles.topRow}>
            <View style={[styles.categoryChip, { backgroundColor: `${cat.mapColor}22` }]}>
              <Ionicons name={cat.mapIcon} size={13} color={cat.mapColor} />
              <AppText variant="caption" style={{ color: cat.mapColor, marginLeft: 4 }}>
                {cat.label}
              </AppText>
            </View>
            <SeverityBadge severity={incident.severity} />
          </View>
          <AppText
            variant="body"
            style={[styles.title, { color: theme.text }]}
            numberOfLines={2}
          >
            {incident.title}
          </AppText>
      </Pressable>

      {media.length > 0 ? (
        <FeedCardMedia
          media={media}
          autoplay={preferences.feedVideoAutoplay}
          onImagePress={openDetail}
        />
      ) : (
        <Pressable
        accessibilityRole="button"
        style={styles.illustrationWrap}
        onPress={openDetail}
      >
          <IncidentIllustration category={incident.category} size={150} />
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={openDetail}
      >
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
            {corroborationCount > 0 ? (
              <View style={styles.seenPillWrap}>
                {showCorroborationHint ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.seenHint,
                      { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }
                    ]}>

                    <AppText variant="caption" style={[styles.seenHintText, { color: theme.text }]}>
                      People who said they saw this too.
                    </AppText>
                    <View style={[styles.seenHintArrow, { backgroundColor: theme.card, borderColor: theme.border }]} />
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${corroborationCount} people said they saw this too`}
                  hitSlop={8}
                  onPress={showSeenHint}
                  style={[styles.seenPill, { backgroundColor: `${theme.textSecondary}18` }]}>

                  <Ionicons name="eye-outline" size={11} color={theme.textSecondary} />
                  <AppText variant="caption" style={{ color: theme.textSecondary, marginLeft: 3 }}>
                    {corroborationCount}
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.locationRow}>
          <View style={styles.locationLeft}>
            {incident.locationName ? (
              <>
                <Ionicons name="location-outline" size={11} color={theme.textSecondary} />
                <AppText
                  variant="caption"
                  style={[styles.locationText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {incident.locationName}
                </AppText>
              </>
            ) : null}
          </View>
          <AppText variant="caption" style={[styles.metaTime, { color: theme.textSecondary }]}>
            {formatTimeAgo(incident.closedAt)}
          </AppText>
        </View>
      </Pressable>
    </View>
  );

};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  title: {
    marginBottom: 10,
    lineHeight: 20
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 4
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  mediaStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1
  },
  outcomePill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  videoPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6
  },
  seenPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center'
  },
  seenPillWrap: {
    position: 'relative',
    marginLeft: 6
  },
  seenHint: {
    position: 'absolute',
    left: -8,
    bottom: 30,
    width: 184,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    zIndex: 20,
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8
  },
  seenHintText: {
    lineHeight: 16
  },
  seenHintArrow: {
    position: 'absolute',
    left: 18,
    bottom: -5,
    width: 10,
    height: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: '45deg' }]
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1
  },
  locationText: {
    marginLeft: 3,
    flexShrink: 1
  },
  metaTime: {
    marginLeft: 8
  }
});

export default React.memo(FeedCard);
