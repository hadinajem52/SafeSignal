import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
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

      <View style={[styles.countBadge, { backgroundColor: theme.surface2, borderColor: theme.border }]}> 
        <Ionicons name="alert-circle-outline" size={16} color={theme.primary} />
        <AppText variant="caption" style={[styles.countText, { color: theme.text }]}> 
          {incidentsCount} {incidentsCount === 1 ? 'incident' : 'incidents'}
        </AppText>
      </View>
    </>
  );
};

export default MapControls;
