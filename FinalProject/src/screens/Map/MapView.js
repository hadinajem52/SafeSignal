import React from 'react';
import { Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
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

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={region}
      onRegionChangeComplete={onRegionChange}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsCompass
      showsScale
      mapType="standard"
      customMapStyle={[]}
      loadingEnabled
      loadingIndicatorColor={theme.mapMarkerDefault}
      loadingBackgroundColor={theme.card}
      onUserLocationChange={null}
    >
      {incidents.map((incident) => {
        const markerColor = getMarkerColor(incident.category, categoryDisplay, theme.mapMarkerDefault);
        const categoryLabel = getCategoryLabel(incident.category, categoryDisplay);

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
              <View style={[styles.calloutContainer, { backgroundColor: theme.card }]}>
                <Text style={[styles.calloutTitle, { color: theme.text }]} numberOfLines={2}>
                  {incident.title}
                </Text>
                <Text style={[styles.calloutCategory, { color: theme.textSecondary }]}> 
                  {categoryLabel}
                </Text>
                <Text style={[styles.calloutTime, { color: theme.textTertiary }]}>
                  {formatTimeAgo(incident.createdAt)}
                </Text>
                <Text style={[styles.calloutTap, { color: theme.mapMarkerDefault }]}>Tap for details</Text>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
};

export default MapCanvas;
