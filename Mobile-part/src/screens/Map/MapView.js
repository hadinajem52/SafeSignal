import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import MapView, { Callout, Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { formatTimeAgo } from '../../utils/dateUtils';
import { getCategoryLabel, getMarkerColor } from '../../utils/mapCategory';
import styles from './mapStyles';

const getConfidenceOpacity = (score) => {
  const parsedScore = Number(score);
  if (!Number.isFinite(parsedScore)) {
    return '55';
  }

  const opacity = Math.max(0.35, Math.min(parsedScore, 0.85));
  return Math.round(opacity * 255).toString(16).padStart(2, '0');
};

const MapCanvas = ({
  mapRef,
  region,
  onRegionChange,
  showsUserLocation,
  incidents,
  categoryDisplay,
  showActiveOverlays,
  onMarkerPress
}) => {
  const { theme } = useTheme();
  const nativeUserLocationEnabled = showsUserLocation;






  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 900);
    return () => clearTimeout(timer);
  }, [incidents]);






  const markers = useMemo(
    () =>
    incidents.
    filter((incident) => {
      const latitude = incident?.location?.latitude;
      const longitude = incident?.location?.longitude;
      return Number.isFinite(latitude) && Number.isFinite(longitude);
    }).
    map((incident) => {
      const markerColor = getMarkerColor(incident.category, categoryDisplay, theme.mapMarkerDefault);
      const categoryLabel = getCategoryLabel(incident.category, categoryDisplay);
      const coordinate = {
        latitude: incident.location.latitude,
        longitude: incident.location.longitude
      };


      if (showActiveOverlays) {
        const isCorroborated = incident.constellation?.confidenceState === 'corroborated';
        const confidenceOpacity = getConfidenceOpacity(incident.constellation?.confidenceScore);

        return (
          <React.Fragment key={incident.id}>
                {isCorroborated ?
            <Circle
              center={coordinate}
              radius={230}
              strokeColor={`${markerColor}${confidenceOpacity}`}
              fillColor="transparent"
              strokeWidth={3} /> :

            null}
                <Circle
              center={coordinate}
              radius={150}
              strokeColor={`${markerColor}80`}
              fillColor={`${markerColor}22`} />

                <Marker
              coordinate={coordinate}
              onPress={() => onMarkerPress(incident)}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 0.5 }}>

                  <View style={{ width: 40, height: 40, opacity: 0 }} />
                </Marker>
              </React.Fragment>);

      }


      return (
        <Marker
          key={incident.id}
          coordinate={coordinate}
          pinColor={markerColor}
          onPress={() => onMarkerPress(incident)}
          tracksViewChanges={tracksViewChanges}>

              <View style={styles.markerContainer}>
                <View style={[styles.markerIconContainer, { backgroundColor: markerColor }]}>
                  <Ionicons
                name={categoryDisplay[incident.category]?.mapIcon || 'help-circle'}
                size={16}
                color={theme.card} />

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
                    {incident.closedAt || incident.createdAt || incident.timestamp ?
                formatTimeAgo(incident.closedAt || incident.createdAt || incident.timestamp) :
                'Just now'}
                  </AppText>
                  <AppText variant="small" style={[styles.calloutTap, { color: theme.mapMarkerDefault }]}>Tap for details</AppText>
                </View>
              </Callout>
            </Marker>);

    }),
    [incidents, categoryDisplay, showActiveOverlays, onMarkerPress, theme, tracksViewChanges]
  );

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
      loadingBackgroundColor={theme.card}>

      {markers}
    </MapView>);

};

export default React.memo(MapCanvas);