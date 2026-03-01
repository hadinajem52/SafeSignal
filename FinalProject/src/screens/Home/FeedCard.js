import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, SeverityBadge } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import incidentConstants from '../../../../constants/incident';
import { formatTimeAgo } from '../../utils/dateUtils';

const { CATEGORY_DISPLAY } = incidentConstants;

const OUTCOME_STYLES = {
  resolved_handled: { label: 'Resolved',     colorKey: 'safetyGood' },
  arrest_made:      { label: 'Arrest Made',  colorKey: 'error'      },
  false_alarm:      { label: 'False Alarm',  colorKey: 'textSecondary' },
  report_filed:     { label: 'Report Filed', colorKey: 'primary'    },
};

const FeedCard = ({ incident, onPress }) => {
  const { theme } = useTheme();
  const cat = CATEGORY_DISPLAY[incident.category] || CATEGORY_DISPLAY.other;
  const outcome = OUTCOME_STYLES[incident.closureOutcome] || {
    label: incident.closureOutcome || 'Closed',
    colorKey: 'textSecondary',
  };
  const outcomeColor = theme[outcome.colorKey] || theme.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => onPress?.(incident)}
      activeOpacity={0.82}
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

      {/* Outcome + meta row */}
      <View style={styles.metaRow}>
        <View style={[styles.outcomePill, { backgroundColor: `${outcomeColor}22` }]}>
          <AppText variant="caption" style={{ color: outcomeColor }}>
            {outcome.label}
          </AppText>
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
    </TouchableOpacity>
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outcomePill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
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

export default FeedCard;
