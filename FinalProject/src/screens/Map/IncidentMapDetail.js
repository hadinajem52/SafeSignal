import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { formatTimeAgo } from '../../utils/dateUtils';
import { getCategoryLabel, getMarkerColor } from '../../utils/mapCategory';
import mapStyles from './mapStyles';

const IncidentMapDetail = ({ selectedIncident, onClose, onCenterMap, categoryDisplay }) => {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(280)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const isVisible = !!selectedIncident;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : 280,
        duration: isVisible ? 220 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isVisible ? 1 : 0,
        duration: isVisible ? 220 : 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedIncident, opacity, translateY]);

  if (!selectedIncident) {
    return null;
  }

  const markerColor = getMarkerColor(selectedIncident.category, categoryDisplay, theme.mapMarkerDefault);
  const categoryLabel = getCategoryLabel(selectedIncident.category, categoryDisplay);
  const incidentTime = selectedIncident.createdAt || selectedIncident.timestamp;
  const latitude = Number(selectedIncident?.location?.latitude);
  const longitude = Number(selectedIncident?.location?.longitude);
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

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
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[mapStyles.sheetHandle, { backgroundColor: theme.divider }]} />

        <>
            <View style={mapStyles.detailHeader}>
              <View style={[mapStyles.detailCategoryBadge, { backgroundColor: markerColor }]}> 
                <Ionicons
                  name={categoryDisplay[selectedIncident.category]?.mapIcon || 'help-circle'}
                  size={15}
                  color="#fff"
                />
                <AppText variant="caption" style={mapStyles.detailCategoryText}>
                  {categoryLabel}
                </AppText>
              </View>
              <AppText variant="caption" style={{ color: theme.textSecondary }}>
                {incidentTime ? formatTimeAgo(incidentTime) : 'Just now'}
              </AppText>
            </View>

            <AppText variant="h4" style={[mapStyles.detailTitle, { color: theme.text }]}>
              {selectedIncident.title}
            </AppText>

            <View style={mapStyles.detailMetaRow}>
              <Ionicons name="checkmark-circle-outline" size={17} color={theme.success} />
              <AppText variant="caption" style={[mapStyles.detailMetaText, { color: theme.success }]}> 
                {String(selectedIncident.status || '').replace(/_/g, ' ')}
              </AppText>
            </View>

            <View style={mapStyles.detailMetaRow}>
              <Ionicons name="location-outline" size={17} color={theme.textSecondary} />
              <AppText variant="caption" style={[mapStyles.detailMetaText, { color: theme.textSecondary }]}> 
                {hasValidCoordinates ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Location unavailable'}
              </AppText>
            </View>

            <View style={mapStyles.detailActions}>
              <Button
                title="Center on Map"
                onPress={() => onCenterMap(selectedIncident)}
                disabled={!hasValidCoordinates}
              />
            </View>
          </>
      </Animated.View>
    </Animated.View>
  );
};

export default IncidentMapDetail;
