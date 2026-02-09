import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { incidentAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import useUserPreferences from '../hooks/useUserPreferences';
import incidentConstants from '../../../constants/incident';
import useIncidentFilters from '../hooks/useIncidentFilters';
import useMapRegion from '../hooks/useMapRegion';
import { Button, CategoryFilter, IncidentDetailModal, MapLegend } from '../components';
import { formatTimeAgo } from '../utils/dateUtils';

const { width, height } = Dimensions.get('window');

const { CATEGORY_DISPLAY } = incidentConstants;

// Timeframe options
const TIMEFRAME_OPTIONS = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

// Default map region - Lebanon (Beirut)
const DEFAULT_REGION = {
  latitude: 33.8938,  // Beirut, Lebanon
  longitude: 35.5018,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { preferences } = useUserPreferences();
  const mapRef = useRef(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  
  // Selected incident for detail view
  const [selectedIncident, setSelectedIncident] = useState(null);

  const {
    selectedCategory,
    setSelectedCategory,
    selectedTimeframe,
    setSelectedTimeframe,
  } = useIncidentFilters({ defaultTimeframe: '30d' });

  const {
    region,
    setRegion,
    locationLoading,
    goToMyLocation,
    resetToDefaultRegion,
  } = useMapRegion({
    defaultRegion: DEFAULT_REGION,
    mapRef,
    locationServicesEnabled: preferences.locationServices,
  });

  // Fetch incidents from API
  const fetchIncidents = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = {
        timeframe: selectedTimeframe,
      };

      if (selectedCategory) {
        params.category = selectedCategory;
      }

      const result = await incidentAPI.getMapIncidents(params);

      if (result.success) {
        const allowedStatuses = new Set(['verified', 'dispatched', 'on_scene']);
        const filteredIncidents = result.incidents.filter((incident) =>
          allowedStatuses.has(incident.status)
        );
        setIncidents(filteredIncidents);
        
        // If we have incidents, fit the map to show all of them
        if (filteredIncidents.length > 0 && mapRef.current) {
          const coordinates = filteredIncidents.map(inc => ({
            latitude: inc.location.latitude,
            longitude: inc.location.longitude,
          }));
          
          // Only fit to coordinates if we have them and it's not a manual refresh
          if (!isRefresh && coordinates.length > 0) {
            setTimeout(() => {
              mapRef.current?.fitToCoordinates(coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                animated: true,
              });
            }, 500);
          }
        }
      } else {
        setError(result.error || 'Failed to load incidents');
      }
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Failed to load incidents. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedTimeframe]);

  // Initial load
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Go to user's current location
  // Get marker color based on category
  const getMarkerColor = (category) => {
    return CATEGORY_DISPLAY[category]?.mapColor || CATEGORY_DISPLAY.other.mapColor;
  };

  // Get category label
  const getCategoryLabel = (category) => {
    return CATEGORY_DISPLAY[category]?.label || CATEGORY_DISPLAY.other.label;
  };

  // Handle marker press
  const handleMarkerPress = (incident) => {
    setSelectedIncident(incident);
  };

  // Clear selected incident
  const clearSelectedIncident = () => {
    setSelectedIncident(null);
  };

  // Render timeframe selector
  const renderTimeframeSelector = () => (
    <View style={styles.timeframeContainer}>
      {TIMEFRAME_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.timeframeButton,
            selectedTimeframe === option.value && styles.timeframeButtonActive,
          ]}
          onPress={() => setSelectedTimeframe(option.value)}
        >
          <Text
            style={[
              styles.timeframeText,
              selectedTimeframe === option.value && styles.timeframeTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const handleCenterMap = (incident) => {
    mapRef.current?.animateToRegion({
      latitude: incident.location.latitude,
      longitude: incident.location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    clearSelectedIncident();
  };

  // Render error state
  if (error && !loading && incidents.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle" size={64} color={theme.statusError} />
        <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
        <Button title="Retry" onPress={() => fetchIncidents()} style={styles.retryButton} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={preferences.locationServices}
        showsMyLocationButton={false}
        showsCompass
        showsScale
        mapType="standard"
        customMapStyle={[]}
        loadingEnabled={true}
        loadingIndicatorColor="#1976D2"
        loadingBackgroundColor="#ffffff"
        // Explicitly disable this event prop to fix the error
        onUserLocationChange={null}
      >
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={{
              latitude: incident.location.latitude,
              longitude: incident.location.longitude,
            }}
            pinColor={getMarkerColor(incident.category)}
            onPress={() => handleMarkerPress(incident)}
          >
            <View style={styles.markerContainer}>
              <View
                style={[
                  styles.markerIconContainer,
                  { backgroundColor: getMarkerColor(incident.category) },
                ]}
              >
                <Ionicons
                  name={CATEGORY_DISPLAY[incident.category]?.mapIcon || 'help-circle'}
                  size={16}
                  color="#fff"
                />
              </View>
              <View style={[styles.markerArrow, { borderTopColor: getMarkerColor(incident.category) }]} />
            </View>
            <Callout tooltip onPress={() => handleMarkerPress(incident)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle} numberOfLines={2}>
                  {incident.title}
                </Text>
                <Text style={styles.calloutCategory}>
                  {getCategoryLabel(incident.category)}
                </Text>
                <Text style={styles.calloutTime}>{formatTimeAgo(incident.createdAt)}</Text>
                <Text style={styles.calloutTap}>Tap for details</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Filter Header */}
      <View style={[styles.filterHeader, { paddingTop: insets.top + 10, backgroundColor: `${theme.card}fc` }]}>
        <View style={styles.filterRow}>
          <CategoryFilter
            categoryDisplay={CATEGORY_DISPLAY}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </View>
        {renderTimeframeSelector()}
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        {/* Legend Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowLegend(true)}
        >
          <Ionicons name="information-circle" size={24} color="#1976D2" />
        </TouchableOpacity>

        {/* My Location Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={goToMyLocation}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color="#1976D2" />
          ) : (
            <Ionicons name="locate" size={24} color="#1976D2" />
          )}
        </TouchableOpacity>

        {/* Reset to Lebanon Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={resetToDefaultRegion}
        >
          <Ionicons name="home" size={24} color="#1976D2" />
        </TouchableOpacity>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => fetchIncidents(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#1976D2" />
          ) : (
            <Ionicons name="refresh" size={24} color="#1976D2" />
          )}
        </TouchableOpacity>
      </View>

      {/* Incident Count Badge */}
      <View style={styles.countBadge}>
        <Ionicons name="flag" size={16} color="#fff" />
        <Text style={styles.countText}>
          {incidents.length} {incidents.length === 1 ? 'incident' : 'incidents'}
        </Text>
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>Loading incidents...</Text>
          </View>
        </View>
      )}

      {/* Modals */}
      <MapLegend
        visible={showLegend}
        onClose={() => setShowLegend(false)}
        categoryDisplay={CATEGORY_DISPLAY}
      />
      <IncidentDetailModal
        visible={!!selectedIncident}
        incident={selectedIncident}
        onClose={clearSelectedIncident}
        onCenterMap={handleCenterMap}
        getMarkerColor={getMarkerColor}
        getCategoryLabel={getCategoryLabel}
        categoryDisplay={CATEGORY_DISPLAY}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  
  // Filter Header Styles
  filterHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  
  // Timeframe Styles
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: 8,
  },
  timeframeButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  timeframeButtonActive: {
    backgroundColor: '#1976D2',
  },
  timeframeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  timeframeTextActive: {
    color: '#fff',
  },

  // Marker Styles
  markerContainer: {
    alignItems: 'center',
  },
  markerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },

  // Callout Styles
  calloutContainer: {
    borderRadius: 8,
    padding: 12,
    minWidth: 150,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutCategory: {
    fontSize: 12,
    marginBottom: 2,
  },
  calloutTime: {
    fontSize: 11,
    marginBottom: 4,
  },
  calloutTap: {
    fontSize: 10,
    color: '#1976D2',
    fontStyle: 'italic',
  },

  // FAB Styles
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 100,
  },
  fab: {
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },

  // Count Badge
  countBadge: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Error Styles
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});

export default MapScreen;
