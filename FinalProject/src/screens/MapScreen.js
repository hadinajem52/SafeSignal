import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal as NativeModal,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { incidentAPI } from '../services/api';
import incidentConstants from '../../../constants/incident';
import useIncidentFilters from '../hooks/useIncidentFilters';
import useMapRegion from '../hooks/useMapRegion';
import { Button, Modal as AppModal } from '../components';

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
  } = useMapRegion({ defaultRegion: DEFAULT_REGION, mapRef });

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
        setIncidents(result.incidents);
        
        // If we have incidents, fit the map to show all of them
        if (result.incidents.length > 0 && mapRef.current) {
          const coordinates = result.incidents.map(inc => ({
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

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Handle marker press
  const handleMarkerPress = (incident) => {
    setSelectedIncident(incident);
  };

  // Clear selected incident
  const clearSelectedIncident = () => {
    setSelectedIncident(null);
  };

  // Render category filter chips
  const renderCategoryFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScrollContent}
    >
      <TouchableOpacity
        style={[
          styles.filterChip,
          !selectedCategory && styles.filterChipActive,
        ]}
        onPress={() => setSelectedCategory(null)}
      >
        <Text
          style={[
            styles.filterChipText,
            !selectedCategory && styles.filterChipTextActive,
          ]}
        >
          All
        </Text>
      </TouchableOpacity>
      {Object.entries(CATEGORY_DISPLAY).map(([key, config]) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.filterChip,
            selectedCategory === key && styles.filterChipActive,
            selectedCategory === key && { backgroundColor: config.mapColor },
          ]}
          onPress={() => setSelectedCategory(selectedCategory === key ? null : key)}
        >
          <Ionicons
            name={config.mapIcon}
            size={14}
            color={selectedCategory === key ? '#fff' : config.mapColor}
            style={styles.filterChipIcon}
          />
          <Text
            style={[
              styles.filterChipText,
              selectedCategory === key && styles.filterChipTextActive,
            ]}
          >
            {config.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

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

  // Render legend
  const renderLegend = () => (
    <AppModal
      visible={showLegend}
      animationType="fade"
      onClose={() => setShowLegend(false)}
      overlayStyle={styles.legendOverlay}
      contentStyle={styles.legendContainer}
    >
      <Text style={styles.legendTitle}>Incident Categories</Text>
      {Object.entries(CATEGORY_DISPLAY).map(([key, config]) => (
        <View key={key} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: config.mapColor }]} />
          <Ionicons name={config.mapIcon} size={18} color={config.mapColor} />
          <Text style={styles.legendText}>{config.label}</Text>
        </View>
      ))}
    </AppModal>
  );

  // Render incident detail modal
  const renderIncidentDetail = () => (
    <NativeModal
      visible={!!selectedIncident}
      transparent
      animationType="slide"
      onRequestClose={clearSelectedIncident}
    >
      <TouchableOpacity
        style={styles.detailOverlay}
        activeOpacity={1}
        onPress={clearSelectedIncident}
      >
        <View style={styles.detailContainer}>
          <TouchableOpacity
            style={styles.detailCloseButton}
            onPress={clearSelectedIncident}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          
          {selectedIncident && (
            <>
              <View style={styles.detailHeader}>
                <View
                  style={[
                    styles.detailCategoryBadge,
                    { backgroundColor: getMarkerColor(selectedIncident.category) },
                  ]}
                >
                  <Ionicons
                    name={CATEGORY_DISPLAY[selectedIncident.category]?.mapIcon || 'help-circle'}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.detailCategoryText}>
                    {getCategoryLabel(selectedIncident.category)}
                  </Text>
                </View>
                <Text style={styles.detailTime}>
                  {formatDate(selectedIncident.createdAt)}
                </Text>
              </View>
              
              <Text style={styles.detailTitle}>{selectedIncident.title}</Text>
              
              <View style={styles.detailStatusRow}>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={styles.detailStatusText}>
                  {selectedIncident.status.charAt(0).toUpperCase() + selectedIncident.status.slice(1)}
                </Text>
              </View>
              
              <View style={styles.detailLocationRow}>
                <Ionicons name="location" size={18} color="#666" />
                <Text style={styles.detailLocationText}>
                  {selectedIncident.location.latitude.toFixed(4)}, {selectedIncident.location.longitude.toFixed(4)}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.centerMapButton}
                onPress={() => {
                  mapRef.current?.animateToRegion({
                    latitude: selectedIncident.location.latitude,
                    longitude: selectedIncident.location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                  clearSelectedIncident();
                }}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.centerMapButtonText}>Center on Map</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </NativeModal>
  );

  // Render error state
  if (error && !loading && incidents.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
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
        showsUserLocation
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
                <Text style={styles.calloutTime}>{formatDate(incident.createdAt)}</Text>
                <Text style={styles.calloutTap}>Tap for details</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Filter Header */}
      <View style={[styles.filterHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.filterRow}>
          {renderCategoryFilters()}
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
      {renderLegend()}
      {renderIncidentDetail()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
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
  filterScrollContent: {
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  filterChipIcon: {
    marginRight: 4,
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
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
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 4,
  },
  calloutCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  calloutTime: {
    fontSize: 11,
    color: '#999',
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // Count Badge Styles
  countBadge: {
    position: 'absolute',
    left: 16,
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  countText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Loading Styles
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    padding: 24,
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
    color: '#666',
  },
  
  // Error Styles
  errorText: {
    fontSize: 16,
    color: '#666',
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
  
  // Legend Modal Styles
  legendOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: width * 0.8,
    maxHeight: height * 0.7,
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  
  // Detail Modal Styles
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  detailCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingRight: 30,
  },
  detailCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailCategoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailTime: {
    fontSize: 12,
    color: '#999',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailStatusText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 6,
    fontWeight: '500',
  },
  detailLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLocationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  centerMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  centerMapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default MapScreen;
