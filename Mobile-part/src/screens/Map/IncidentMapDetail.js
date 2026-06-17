import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { AppText, Button } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { formatTimeAgo } from '../../utils/dateUtils';
import { normalizeClosureDetails } from '../../utils/incidentUtils';
import { getCategoryLabel, getMarkerColor } from '../../utils/mapCategory';
import mapStyles from './mapStyles';

const IncidentMapDetail = ({
  selectedIncident,
  onClose,
  onCenterMap,
  categoryDisplay,
  showResolvedDetails,
  canCenter = true,
}) => {
  const { theme } = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const translateY = useRef(new Animated.Value(280)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  // Keep the last incident on screen while the sheet animates out, so the close
  // (slide-down + fade) actually plays before the component unmounts. Without this
  // the parent clears selectedIncident, we return null immediately, and the exit
  // animation never runs (the sheet just vanishes).
  const [renderedIncident, setRenderedIncident] = useState(selectedIncident);

  useEffect(() => {
    if (selectedIncident) {
      setRenderedIncident(selectedIncident);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, { toValue: 280, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        setRenderedIncident(null);
      }
    });
  }, [selectedIncident, opacity, translateY]);

  const incident = renderedIncident;

  if (!incident) {
    return null;
  }

  const markerColor = getMarkerColor(incident.category, categoryDisplay, theme.mapMarkerDefault);
  const categoryLabel = getCategoryLabel(incident.category, categoryDisplay);
  const incidentTime = incident.closedAt || incident.createdAt || incident.timestamp;
  const latitude = Number(incident?.location?.latitude);
  const longitude = Number(incident?.location?.longitude);
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const corroboratedSignals =
    incident.constellation?.confidenceState === 'corroborated'
      ? Number(incident.constellation?.supportingSignals) || 0
      : 0;

  return (
    <Animated.View style={[mapStyles.sheetBackdrop, { opacity }]}>
      <Pressable style={mapStyles.sheetBackDropTouchable} onPress={onClose} />
      <Animated.View
        style={[
          mapStyles.detailSheet,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: theme.shadow,
            paddingBottom: tabBarHeight + 16,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[mapStyles.sheetHandle, { backgroundColor: theme.divider }]} />

        <View style={mapStyles.detailHeader}>
          <View style={[mapStyles.detailCategoryBadge, { backgroundColor: markerColor }]}>
            <Ionicons
              name={categoryDisplay[incident.category]?.mapIcon || 'help-circle'}
              size={15}
              color="#fff"
            />
            <AppText variant="caption" style={mapStyles.detailCategoryText}>
              {categoryLabel}
            </AppText>
          </View>
          {showResolvedDetails ? (
            <AppText variant="caption" style={{ color: theme.textSecondary }}>
              {incidentTime ? formatTimeAgo(incidentTime) : 'Just now'}
            </AppText>
          ) : null}
        </View>

        {/* Resolved mode: full details including optional closure fields */}
        {showResolvedDetails ? (
          <>
            <AppText variant="h4" style={[mapStyles.detailTitle, { color: theme.text }]}>
              {incident.title}
            </AppText>

            <View style={mapStyles.detailMetaRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={theme.success} />
              <AppText variant="caption" style={[mapStyles.detailMetaText, { color: theme.success }]}>
                {String(incident.status || '').replace(/_/g, ' ')}
              </AppText>
            </View>

            {incident.closureOutcome ? (
              <View style={mapStyles.detailMetaRow}>
                <Ionicons name="shield-checkmark-outline" size={17} color={theme.primary} />
                <AppText variant="caption" style={[mapStyles.detailMetaText, { color: theme.primary }]}>
                  {String(incident.closureOutcome).replace(/_/g, ' ')}
                </AppText>
              </View>
            ) : null}

            {incident.closureDetails ? (
              <AppText
                variant="caption"
                style={[mapStyles.detailMetaText, { color: theme.textSecondary, marginTop: 4 }]}
                numberOfLines={3}
              >
                {normalizeClosureDetails(incident.closureDetails)}
              </AppText>
            ) : null}

            <View style={mapStyles.detailMetaRow}>
              <Ionicons name="location-outline" size={17} color={theme.textSecondary} />
              <AppText variant="caption" style={[mapStyles.detailMetaText, { color: theme.textSecondary }]}>
                {incident.locationName ||
                  (hasValidCoordinates
                    ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                    : 'Location unavailable')}
              </AppText>
            </View>
          </>
        ) : null}

        {showResolvedDetails && canCenter ? (
          <View style={mapStyles.detailActions}>
            <Button
              title="Center on Map"
              onPress={() => onCenterMap(incident)}
              disabled={!hasValidCoordinates}
            />
          </View>
        ) : null}

        {!showResolvedDetails && corroboratedSignals > 0 ? (
          <View style={mapStyles.detailMetaRow}>
            <Ionicons name="people-circle-outline" size={17} color={theme.primary} />
            <AppText variant="caption" style={[mapStyles.detailMetaText, { color: theme.textSecondary }]}>
              Community signals corroborate this report ({corroboratedSignals})
            </AppText>
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
};

export default IncidentMapDetail;
