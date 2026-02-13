import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import styles from './mapStyles';

const MapControls = ({
  onShowLegend,
  onMyLocation,
  onResetRegion,
  onRefresh,
  locationLoading,
  refreshing,
  incidentsCount,
}) => {
  const { theme } = useTheme();

  return (
    <>
      <View style={styles.fabContainer}>
        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.card }]} onPress={onShowLegend}>
          <Ionicons name="information-circle" size={24} color={theme.mapMarkerDefault} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.card }]}
          onPress={onMyLocation}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={theme.mapMarkerDefault} />
          ) : (
            <Ionicons name="locate" size={24} color={theme.mapMarkerDefault} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.card }]} onPress={onResetRegion}>
          <Ionicons name="home" size={24} color={theme.mapMarkerDefault} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.card }]}
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.mapMarkerDefault} />
          ) : (
            <Ionicons name="refresh" size={24} color={theme.mapMarkerDefault} />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.countBadge, { backgroundColor: theme.mapMarkerDefault }]}>
        <Ionicons name="flag" size={16} color={theme.card} />
        <Text style={[styles.countText, { color: theme.card }]}>
          {incidentsCount} {incidentsCount === 1 ? 'incident' : 'incidents'}
        </Text>
      </View>
    </>
  );
};

export default MapControls;
