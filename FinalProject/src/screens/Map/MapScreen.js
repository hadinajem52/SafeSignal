import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { incidentAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import useUserPreferences from '../../hooks/useUserPreferences';
import incidentConstants from '../../../../constants/incident';
import useIncidentFilters from '../../hooks/useIncidentFilters';
import useMapRegion from '../../hooks/useMapRegion';
import { Button, MapLegend } from '../../components';
import CategoryFilterBar from './CategoryFilterBar';
import IncidentMapDetail from './IncidentMapDetail';
import MapControls from './MapControls';
import MapCanvas from './MapView';
import mapStyles from './mapStyles';
import TimeframeSelector from './TimeframeSelector';

const { CATEGORY_DISPLAY } = incidentConstants;

const DEFAULT_REGION = {
  latitude: 33.8938,
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
  const [selectedIncident, setSelectedIncident] = useState(null);

  const {
    selectedCategory,
    setSelectedCategory,
    selectedTimeframe,
    setSelectedTimeframe,
  } = useIncidentFilters({ defaultTimeframe: '30d' });

  const { region, setRegion, locationLoading, goToMyLocation, resetToDefaultRegion } = useMapRegion({
    defaultRegion: DEFAULT_REGION,
    mapRef,
    locationServicesEnabled: preferences.locationServices,
  });

  const fetchIncidents = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);
        const params = { timeframe: selectedTimeframe };

        if (selectedCategory) {
          params.category = selectedCategory;
        }

        const result = await incidentAPI.getMapIncidents(params);

        if (!result.success) {
          setError(result.error || 'Failed to load incidents');
          return;
        }

        const allowedStatuses = new Set(['verified', 'dispatched', 'on_scene']);
        const filteredIncidents = result.incidents.filter((incident) =>
          allowedStatuses.has(incident.status)
        );
        setIncidents(filteredIncidents);

        if (filteredIncidents.length > 0 && mapRef.current && !isRefresh) {
          const coordinates = filteredIncidents.map((incident) => ({
            latitude: incident.location.latitude,
            longitude: incident.location.longitude,
          }));

          setTimeout(() => {
            mapRef.current?.fitToCoordinates(coordinates, {
              edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
              animated: true,
            });
          }, 500);
        }
      } catch (fetchError) {
        console.error('Error fetching incidents:', fetchError);
        setError('Failed to load incidents. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory, selectedTimeframe]
  );

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const clearSelectedIncident = () => {
    setSelectedIncident(null);
  };

  const handleCenterMap = (incident) => {
    mapRef.current?.animateToRegion({
      latitude: incident.location.latitude,
      longitude: incident.location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    clearSelectedIncident();
  };

  if (error && !loading && incidents.length === 0) {
    return (
      <View style={[mapStyles.centerContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle" size={64} color={theme.error} />
        <Text style={[mapStyles.errorText, { color: theme.textSecondary }]}>{error}</Text>
        <Button
          title="Retry"
          onPress={() => fetchIncidents()}
          style={[mapStyles.retryButton, { backgroundColor: theme.mapMarkerDefault }]}
        />
      </View>
    );
  }

  return (
    <View style={mapStyles.container}>
      <MapCanvas
        mapRef={mapRef}
        region={region}
        onRegionChange={setRegion}
        showsUserLocation={preferences.locationServices}
        incidents={incidents}
        categoryDisplay={CATEGORY_DISPLAY}
        onMarkerPress={setSelectedIncident}
      />

      <View
        style={[
          mapStyles.filterHeader,
          { paddingTop: insets.top + 10, backgroundColor: `${theme.card}fc` },
        ]}
      >
        <CategoryFilterBar
          categoryDisplay={CATEGORY_DISPLAY}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <TimeframeSelector
          selectedTimeframe={selectedTimeframe}
          onSelectTimeframe={setSelectedTimeframe}
        />
      </View>

      <MapControls
        onShowLegend={() => setShowLegend(true)}
        onMyLocation={goToMyLocation}
        onResetRegion={resetToDefaultRegion}
        onRefresh={() => fetchIncidents(true)}
        locationLoading={locationLoading}
        refreshing={refreshing}
        incidentsCount={incidents.length}
      />

      {loading ? (
        <View style={[mapStyles.loadingOverlay, { backgroundColor: `${theme.background}bf` }]}>
          <View style={[mapStyles.loadingContainer, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={theme.mapMarkerDefault} />
            <Text style={[mapStyles.loadingText, { color: theme.text }]}>Loading incidents...</Text>
          </View>
        </View>
      ) : null}

      <MapLegend
        visible={showLegend}
        onClose={() => setShowLegend(false)}
        categoryDisplay={CATEGORY_DISPLAY}
      />

      <IncidentMapDetail
        selectedIncident={selectedIncident}
        onClose={clearSelectedIncident}
        onCenterMap={handleCenterMap}
        categoryDisplay={CATEGORY_DISPLAY}
      />
    </View>
  );
};

export default MapScreen;
