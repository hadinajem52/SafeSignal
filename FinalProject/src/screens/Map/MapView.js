import React from 'react';
import { Platform, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
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
        const incidentTime = incident.createdAt || incident.timestamp;

        return (
          <Marker
            key={incident.id}
            coordinate={{
              latitude: incident.location.latitude,
              longitude: incident.location.longitude,
            }}
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
                  {incidentTime ? formatTimeAgo(incidentTime) : 'Just now'}
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
