import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import incidentConstants from '../../../constants/incident';
import { formatDate } from '../utils/dateUtils';
import {
  AppText,
  Card,
  SeverityBadge,
  StatusBadge,
  IncidentTimeline,
  IncidentVideoPlayer,
} from '../components';
import { normalizeClosureDetails } from '../utils/incidentUtils';
import { useTheme } from '../context/ThemeContext';
import { incidentAPI } from '../services/api';
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

const IncidentDetailScreen = ({ route, navigation }) => {
  const { incident, source } = route.params || {};
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [detailIncident, setDetailIncident] = useState(incident || null);
  const [loadingDetail, setLoadingDetail] = useState(Boolean(getIncidentId(incident)));

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
      <View style={[styles.emptyContainer, { backgroundColor: theme.surface, paddingTop: insets.top }]}> 
        <AppText variant="body" style={{ color: theme.textSecondary }}>Incident details not available.</AppText>
      </View>
    );
  }

  const categoryConfig = CATEGORY_DISPLAY[detailIncident.category] || CATEGORY_DISPLAY.other;
  const displayStatus = detailIncident.status === 'police_closed' ? 'resolved' : detailIncident.status;
  const statusLabel = STATUS_LABELS[displayStatus] || displayStatus;
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
  const resolvedLabel = closureOutcome
    ? `${statusLabel} - ${closureOutcome.replace(/\b\w/g, (char) => char.toUpperCase())}`
    : statusLabel;
  const rawClosureDetails = detailIncident.closure_details || detailIncident.closureDetails;
  const closureDetails = normalizeClosureDetails(rawClosureDetails);
  const description = detailIncident.description || closureDetails || 'No description available.';
  const locationLabel = detailIncident.locationName || detailIncident.location_name || 'Location not set';
  const showTimeline = source !== 'community_feed';
  const constellationCopy = getConstellationCopy(detailIncident.constellation);
  const videoUrl = detailIncident.video_url || detailIncident.videoUrl;

  return (
    <View style={[styles.screenWrapper, { backgroundColor: theme.surface, paddingTop: insets.top }]}>
      <View style={[styles.backHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
          <AppText variant="body" style={{ color: theme.text }}>Back</AppText>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: tabBarHeight + 8 }]}
        showsVerticalScrollIndicator={false}
      >
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.surface }]}> 
            <Ionicons name={categoryConfig.mapIcon || 'help-circle-outline'} size={15} color={theme.primary} style={styles.categoryIcon} />
            <AppText variant="caption" style={{ color: theme.text }}>{categoryConfig.label}</AppText>
          </View>
          <View style={styles.badgesRow}>
            {detailIncident.severity ? <SeverityBadge severity={detailIncident.severity} /> : null}
            <StatusBadge status={displayStatus} />
          </View>
        </View>
        <AppText variant="h3" style={[styles.title, { color: theme.text }]}>{detailIncident.title}</AppText>
        <AppText variant="bodySmall" style={{ color: theme.textSecondary }}>{resolvedLabel}</AppText>
        {loadingDetail ? <ActivityIndicator color={theme.primary} style={styles.detailLoader} /> : null}
        {closureOutcome ? (
          <AppText variant="caption" style={[styles.outcomeText, { color: theme.success }]}>Outcome: {closureOutcome}</AppText>
        ) : null}
      </Card>

      <Card style={styles.sectionCard}>
        <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Description</AppText>
        <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{description}</AppText>
      </Card>

      <IncidentVideoPlayer videoUrl={videoUrl} />

      {constellationCopy ? (
        <Card style={[styles.constellationCard, { borderColor: theme.border, backgroundColor: theme.card }]}> 
          <View style={styles.constellationHeader}>
            <Ionicons
              name={detailIncident.constellation.status === 'flagged' ? 'shield-outline' : 'radio-outline'}
              size={18}
              color={detailIncident.constellation.status === 'flagged' ? theme.warning : theme.primary}
            />
            <AppText variant="label" style={[styles.constellationTitle, { color: theme.text }]}> 
              {constellationCopy.title}
            </AppText>
          </View>
          <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}> 
            {constellationCopy.body}
          </AppText>
        </Card>
      ) : null}

      {closureDetails ? (
        <Card style={styles.sectionCard}>
          <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Closure Details</AppText>
          <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{closureDetails}</AppText>
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Location</AppText>
        <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}> 
          {hasValidCoordinates
            ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            : locationLabel}
        </AppText>
      </Card>

      <Card style={styles.sectionCard}>
        <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Reported</AppText>
        <AppText variant="body" style={[styles.sectionText, { color: theme.textSecondary }]}>{reportedAtLabel}</AppText>
      </Card>
      
      {showTimeline ? (
        <Card style={styles.timelineCard}>
          <AppText variant="label" style={[styles.sectionTitle, { color: theme.text }]}>Updates & Messages</AppText>
          <View style={styles.timelineContainer}>
            <IncidentTimeline 
              incidentId={getIncidentId(detailIncident)}
            />
          </View>
        </Card>
      ) : null}
    </ScrollView>
    </View>
  );
};

export default IncidentDetailScreen;
