import React from 'react';
import { Platform, View } from 'react-native';
import MapView, { Callout, Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { formatTimeAgo } from '../../utils/dateUtils';
import { getCategoryLabel, getMarkerColor } from '../../utils/mapCategory';
import styles from './mapStyles';

const MapCanvas = ({
  mapRef,
  region,
  onRegionChange,
  showsUserLocation,
  incidents,
  categoryDisplay,
  showActiveOverlays,
  onMarkerPress,
}) => {
  const { theme } = useTheme();
  const nativeUserLocationEnabled = showsUserLocation;

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={region}
      onRegionChangeComplete={onRegionChange}
      showsUserLocation={nativeUserLocationEnabled}
      showsMyLocationButton={false}
      showsCompass
      showsScale
      mapType="standard"
      customMapStyle={[]}
      loadingEnabled
      loadingIndicatorColor={theme.mapMarkerDefault}
      loadingBackgroundColor={theme.card}
    >
      {incidents.filter((incident) => {
        const latitude = incident?.location?.latitude;
        const longitude = incident?.location?.longitude;
        return Number.isFinite(latitude) && Number.isFinite(longitude);
      }).map((incident) => {
        const markerColor = getMarkerColor(incident.category, categoryDisplay, theme.mapMarkerDefault);
        const categoryLabel = getCategoryLabel(incident.category, categoryDisplay);
        const coordinate = {
          latitude: incident.location.latitude,
          longitude: incident.location.longitude,
        };

        // Active mode: decorative radius circle + transparent tap-target marker
        if (showActiveOverlays) {
          return (
            <React.Fragment key={incident.id}>
              <Circle
                center={coordinate}
                radius={150}
                strokeColor={`${markerColor}80`}
                fillColor={`${markerColor}22`}
              />
              <Marker
                coordinate={coordinate}
                onPress={() => onMarkerPress(incident)}
                tracksViewChanges={false}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={{ width: 40, height: 40, opacity: 0 }} />
              </Marker>
            </React.Fragment>
          );
        }

        // Resolved mode: standard icon marker with callout
        return (
          <Marker
            key={incident.id}
            coordinate={coordinate}
            pinColor={markerColor}
            onPress={() => onMarkerPress(incident)}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.markerIconContainer, { backgroundColor: markerColor }]}>
                <Ionicons
                  name={categoryDisplay[incident.category]?.mapIcon || 'help-circle'}
                  size={16}
                  color={theme.card}
                />
              </View>
              <View style={[styles.markerArrow, { borderTopColor: markerColor }]} />
            </View>
            <Callout tooltip onPress={() => onMarkerPress(incident)}>
              <View style={[styles.calloutContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <AppText variant="label" style={[styles.calloutTitle, { color: theme.text }]} numberOfLines={2}>
                  {incident.title}
                </AppText>
                <AppText variant="caption" style={[styles.calloutCategory, { color: theme.textSecondary }]}>
                  {categoryLabel}
                </AppText>
                <AppText variant="small" style={[styles.calloutTime, { color: theme.textTertiary }]}>
                  {incident.closedAt || incident.createdAt || incident.timestamp
                    ? formatTimeAgo(incident.closedAt || incident.createdAt || incident.timestamp)
                    : 'Just now'}
                </AppText>
                <AppText variant="small" style={[styles.calloutTap, { color: theme.mapMarkerDefault }]}>Tap for details</AppText>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
};

export default MapCanvas;
