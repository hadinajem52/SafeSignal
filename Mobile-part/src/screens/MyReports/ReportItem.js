import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import incidentConstants from '../../../../constants/incident';
import { AppText, Card, SeverityBadge, StatusBadge } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { formatTimeAgo } from '../../utils/dateUtils';
import styles from './myReportsStyles';

const { CATEGORY_DISPLAY } = incidentConstants;

const PROGRESS_STEPS = ['Submitted', 'Reviewing', 'Verified', 'Resolved'];

const getSeverityColor = (severity, theme) => {
  switch (severity) {
    case 'low':
      return theme.severityLow;
    case 'medium':
      return theme.severityMedium;
    case 'high':
      return theme.severityHigh;
    case 'critical':
      return theme.severityCritical;
    default:
      return theme.primary;
  }
};

const getProgressStage = (status) => {
  switch (status) {
    case 'draft':
      return 0;
    case 'submitted':
    case 'auto_processed':
    case 'auto_flagged':
      return 1;
    case 'in_review':
    case 'needs_info':
      return 2;
    case 'verified':
    case 'dispatched':
    case 'on_scene':
    case 'investigating':
    case 'published':
    case 'merged':
      return 3;
    case 'police_closed':
    case 'resolved':
    case 'archived':
      return 4;
    case 'rejected':
      return 3;
    default:
      return 1;
  }
};

const getConstellationLabel = (constellation) => {
  if (!constellation || constellation.status === 'flagged') {
    return null;
  }

  const supportingSignals = Number(constellation.supportingSignals || 0);
  if (constellation.confidenceState === 'corroborated' && supportingSignals > 0) {
    return `Corroborated by ${supportingSignals} nearby signal${supportingSignals === 1 ? '' : 's'}`;
  }

  if (constellation.confidenceState === 'mixed_signals') {
    return 'Mixed nearby responses';
  }

  return 'Awaiting corroboration';
};

const ReportItem = ({ item, onPress, onLongPress }) => {
  const { theme } = useTheme();
  const categoryConfig = CATEGORY_DISPLAY[item.category] || {
    label: 'Other',
    mapIcon: 'help-circle',
    mapColor: theme.mapMarkerDefault,
  };
  const hasLocation =
    item.location &&
    Number.isFinite(Number(item.location.latitude)) &&
    Number.isFinite(Number(item.location.longitude));
  const locationDisplay = hasLocation
    ? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
    : item.locationName || 'Location not set';
  const createdAtText = formatTimeAgo(item.createdAt || item.timestamp || new Date().toISOString());
  const stage = getProgressStage(item.status);
  const isRejected = item.status === 'rejected';
  const progressColor = isRejected ? theme.error : theme.primary;
  const constellationLabel = getConstellationLabel(item.constellation);
  const duplicateOfTitle = item.duplicateOfTitle ? `: ${item.duplicateOfTitle}` : '';
  const duplicateOfText = item.duplicateOfIncidentId
    ? `Marked as duplicate of report #${item.duplicateOfIncidentId}${duplicateOfTitle}`
    : null;

  return (
    <Pressable onPress={() => onPress(item)} onLongPress={() => onLongPress && onLongPress(item)} style={styles.incidentCard}>
      {({ pressed }) => (
        <Card
          style={[
            styles.incidentCardInner,
            {
              borderColor: theme.border,
              borderLeftColor: getSeverityColor(item.severity, theme),
              backgroundColor: theme.card,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryConfig.mapColor}20` }]}>
              <Ionicons name={categoryConfig.mapIcon} size={16} color={categoryConfig.mapColor} />
              <AppText variant="caption" style={[styles.categoryLabel, { color: categoryConfig.mapColor }]}>
                {categoryConfig.label}
              </AppText>
            </View>

            <View style={styles.badgesRight}>
              {item.severity ? <SeverityBadge severity={item.severity} style={styles.severityBadge} /> : null}
              <StatusBadge status={item.status} style={styles.statusBadge} />
            </View>
          </View>

          <AppText variant="h5" style={[styles.incidentTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </AppText>

          <AppText variant="body" style={[styles.incidentDescription, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.description || 'No additional details provided.'}
          </AppText>

          {constellationLabel ? (
            <View style={[styles.constellationBadge, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}33` }]}> 
              <Ionicons name="radio-outline" size={14} color={theme.primary} />
              <AppText variant="caption" style={[styles.constellationText, { color: theme.primary }]}>
                {constellationLabel}
              </AppText>
            </View>
          ) : null}

          {duplicateOfText ? (
            <View
              style={[
                styles.duplicateNotice,
                { backgroundColor: `${theme.accentBlue}12`, borderColor: `${theme.accentBlue}33` },
              ]}
            >
              <Ionicons name="git-merge-outline" size={14} color={theme.accentBlue} />
              <AppText variant="caption" style={[styles.duplicateNoticeText, { color: theme.accentBlue }]} numberOfLines={2}>
                {duplicateOfText}
              </AppText>
            </View>
          ) : null}

          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              {PROGRESS_STEPS.map((stepLabel, index) => {
                const stepIndex = index + 1;
                const isComplete = stage >= stepIndex;
                return (
                  <View key={stepLabel} style={styles.progressStepWrap}>
                    <View
                      style={[
                        styles.progressDot,
                        {
                          backgroundColor: isComplete ? progressColor : theme.surface2,
                          borderColor: isComplete ? progressColor : theme.border,
                        },
                      ]}
                    />
                    {index < PROGRESS_STEPS.length - 1 ? (
                      <View
                        style={[
                          styles.progressLine,
                          { backgroundColor: stage > stepIndex ? progressColor : theme.border },
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
            <View style={styles.progressLabels}>
              {PROGRESS_STEPS.map((stepLabel) => (
                <AppText key={stepLabel} variant="small" style={[styles.progressLabel, { color: theme.textTertiary }]}>
                  {stepLabel}
                </AppText>
              ))}
            </View>
          </View>

          <View style={[styles.cardFooter, { borderTopColor: theme.divider }]}> 
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color={theme.textSecondary} style={styles.locationIcon} />
              <AppText variant="caption" style={[styles.locationText, { color: theme.textSecondary }]} numberOfLines={1}>
                {locationDisplay}
              </AppText>
            </View>
            <AppText variant="caption" style={[styles.dateText, { color: theme.textTertiary }]}>
              {createdAtText}
            </AppText>
          </View>
        </Card>
      )}
    </Pressable>
  );
};

export default ReportItem;
