import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import incidentConstants from '../../../../constants/incident';
import { AppText, Card, PressableScale, SeverityBadge, StatusBadge } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { formatTimeAgo } from '../../utils/dateUtils';
import styles from './myReportsStyles';

const { CATEGORY_DISPLAY } = incidentConstants;

const PROGRESS_STEPS = ['Submitted', 'In Review', 'Verified', 'Response', 'Resolved'];

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
    case 'submitted':
      return 1;
    case 'auto_processed':
    case 'auto_flagged':
    case 'in_review':
    case 'needs_info':
      return 2;
    case 'verified':
    case 'published':
    case 'merged':
      return 3;
    case 'dispatched':
    case 'on_scene':
    case 'investigating':
      return 4;
    case 'police_closed':
    case 'resolved':
    case 'archived':
      return 5;
    case 'rejected':
      return 2;
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
    mapColor: theme.mapMarkerDefault
  };
  const locationDisplay =
  item.locationName || item.location_name || 'Location not set';
  const createdAtText = formatTimeAgo(item.createdAt || item.timestamp || new Date().toISOString());



  const readsAsRejected =
  item.status === 'rejected' ||
  item.status === 'merged' && item.duplicateOfStatus === 'rejected';
  const stage = readsAsRejected ? 2 : getProgressStage(item.status);
  const progressColor = readsAsRejected ? theme.error : theme.primary;
  const constellationLabel = getConstellationLabel(item.constellation);
  const duplicateOfTitle = item.duplicateOfTitle ? `: ${item.duplicateOfTitle}` : '';
  const duplicateOfText = item.duplicateOfIncidentId ?
  `Marked as duplicate of report #${item.duplicateOfIncidentId}${duplicateOfTitle}` :
  null;

  return (
    <PressableScale onPress={() => onPress(item)} onLongPress={() => onLongPress && onLongPress(item)} style={styles.incidentCard}>
        <Card
        style={[
        styles.incidentCardInner,
        {
          borderColor: getSeverityColor(item.severity, theme),
          backgroundColor: theme.card
        }]
        }>

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

          {constellationLabel ?
        <View style={[styles.constellationBadge, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}33` }]}>
              <Ionicons name="radio-outline" size={14} color={theme.primary} />
              <AppText variant="caption" style={[styles.constellationText, { color: theme.primary }]}>
                {constellationLabel}
              </AppText>
            </View> :
        null}

          {duplicateOfText ?
        <View
          style={[
          styles.duplicateNotice,
          { backgroundColor: `${theme.accentBlue}12`, borderColor: `${theme.accentBlue}33` }]
          }>

              <Ionicons name="git-merge-outline" size={14} color={theme.accentBlue} />
              <AppText variant="caption" style={[styles.duplicateNoticeText, { color: theme.accentBlue }]} numberOfLines={2}>
                {duplicateOfText}
              </AppText>
            </View> :
        null}

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
                      borderColor: isComplete ? progressColor : theme.border
                    }]
                    } />

                    {index < PROGRESS_STEPS.length - 1 ?
                  <View
                    style={[
                    styles.progressLine,
                    { backgroundColor: stage > stepIndex ? progressColor : theme.border }]
                    } /> :

                  null}
                  </View>);

            })}
            </View>
            <View style={styles.progressLabels}>
              {PROGRESS_STEPS.map((stepLabel) =>
            <AppText key={stepLabel} variant="small" style={[styles.progressLabel, { color: theme.textTertiary }]}>
                  {stepLabel}
                </AppText>
            )}
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
    </PressableScale>);

};




export default React.memo(ReportItem);