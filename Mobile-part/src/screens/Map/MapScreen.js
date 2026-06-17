import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, LayoutAnimation, Platform, TouchableOpacity, UIManager, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { incidentAPI } from "../../services/api";
import { feedAPI } from "../../services/feedAPI";
import { useTheme } from "../../context/ThemeContext";
import useUserPreferences from "../../hooks/useUserPreferences";
import incidentConstants from "../../../../constants/incident";
import useIncidentFilters from "../../hooks/useIncidentFilters";
import useMapRegion from "../../hooks/useMapRegion";
import { AppText, MapLegend, EmptyState, EMPTY_ART } from "../../components";
import CategoryFilterBar from "./CategoryFilterBar";
import IncidentMapDetail from "./IncidentMapDetail";
import MapControls from "./MapControls";
import MapCanvas from "./MapView";
import MapList from "./MapList";
import mapStyles from "./mapStyles";
import TimeframeSelector from "./TimeframeSelector";

const { CATEGORY_DISPLAY } = incidentConstants;
const MAP_HINT_STORAGE_KEY = "map_first_visit_hint_seen";

const MAP_MODES = { ACTIVE: 'active', RESOLVED: 'resolved' };
const RESOLVED_PAGE_SIZE = 100;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DEFAULT_REGION = {
  latitude: 33.8938,
  longitude: 35.5018,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15
};

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { preferences } = useUserPreferences();
  const mapRef = useRef(null);
  const activeRequestId = useRef(0);




  const lastRegionRef = useRef(DEFAULT_REGION);

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [mapMode, setMapMode] = useState(MAP_MODES.ACTIVE);
  const [showMapHint, setShowMapHint] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(150);
  const [viewMode, setViewMode] = useState("map");
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersExpanded((prev) => !prev);
  };

  const {
    selectedCategory,
    setSelectedCategory,
    selectedTimeframe,
    setSelectedTimeframe
  } = useIncidentFilters({ defaultTimeframe: "30d" });

  const {
    region,
    locationLoading,
    goToMyLocation,
    resetToDefaultRegion
  } = useMapRegion({
    defaultRegion: DEFAULT_REGION,
    mapRef
  });

  const fetchIncidents = useCallback(
    async (isRefresh = false) => {
      const requestId = activeRequestId.current + 1;
      activeRequestId.current = requestId;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
          setIncidents([]);
        }

        setError(null);

        let result;
        if (mapMode === MAP_MODES.ACTIVE) {

          const params = {
            timeframe: selectedTimeframe === 'all' ? '30d' : selectedTimeframe,
            includeConstellation: true
          };
          if (selectedCategory) params.category = selectedCategory;
          result = await incidentAPI.getMapIncidents(params);
        } else {
          const resolvedIncidents = [];
          let total = 0;
          let offset = 0;

          do {
            const page = await feedAPI.getPublicFeed({
              category: selectedCategory || undefined,

              timeframe: selectedTimeframe === 'all' ? undefined : selectedTimeframe,
              limit: RESOLVED_PAGE_SIZE,
              offset
            });

            if (activeRequestId.current !== requestId) {
              return;
            }

            if (!page.success) {
              result = page;
              break;
            }

            resolvedIncidents.push(...page.incidents);
            total = Number(page.total) || resolvedIncidents.length;
            offset += page.incidents.length;
            result = {
              success: true,
              incidents: resolvedIncidents,
              total
            };
          } while (offset > 0 && offset < total);
        }

        if (activeRequestId.current !== requestId) {
          return;
        }

        if (!result.success) {
          setError(result.error || "Failed to load incidents");
          return;
        }


        const filteredIncidents = result.incidents.filter((incident) => {
          const latitude = Number(incident?.location?.latitude);
          const longitude = Number(incident?.location?.longitude);
          return Number.isFinite(latitude) && Number.isFinite(longitude);
        });
        setIncidents(filteredIncidents);

        if (
        filteredIncidents.length > 0 &&
        mapRef.current &&
        !isRefresh &&
        !preferences.locationServices)
        {
          const coordinates = filteredIncidents.map((incident) => ({
            latitude: incident.location.latitude,
            longitude: incident.location.longitude
          }));

          setTimeout(() => {
            mapRef.current?.fitToCoordinates(coordinates, {
              edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
              animated: true
            });
          }, 500);
        }
      } catch (fetchError) {
        if (activeRequestId.current !== requestId) {
          return;
        }
        console.error("Error fetching incidents:", fetchError);
        setError("Failed to load incidents. Please try again.");
      } finally {
        if (activeRequestId.current === requestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [mapMode, preferences.locationServices, selectedCategory, selectedTimeframe]
  );

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    setSelectedIncident(null);
  }, [mapMode]);

  useEffect(() => {
    setSelectedIncident(null);
  }, [viewMode]);



  useEffect(() => {
    if (mapMode === MAP_MODES.ACTIVE && selectedTimeframe === 'all') {
      setSelectedTimeframe('30d');
    }
  }, [mapMode, selectedTimeframe, setSelectedTimeframe]);

  useEffect(() => {
    let hintTimer;
    const loadHintState = async () => {
      const hintSeen = await AsyncStorage.getItem(MAP_HINT_STORAGE_KEY);
      if (hintSeen === "1") {
        setShowMapHint(false);
        return;
      }

      setShowMapHint(true);
      hintTimer = setTimeout(async () => {
        setShowMapHint(false);
        await AsyncStorage.setItem(MAP_HINT_STORAGE_KEY, "1");
      }, 4200);
    };

    loadHintState().catch(() => {
      setShowMapHint(true);
    });

    return () => {
      if (hintTimer) {
        clearTimeout(hintTimer);
      }
    };
  }, []);

  const clearSelectedIncident = () => {
    setSelectedIncident(null);
  };


  const selectIncident = useCallback((incident) => {
    setSelectedIncident(incident);
  }, []);

  const handleMarkerPress = useCallback((incident) => {
    setShowMapHint(false);
    AsyncStorage.setItem(MAP_HINT_STORAGE_KEY, "1").catch(() => {});
    selectIncident(incident);
  }, [selectIncident]);


  const handleRegionChangeComplete = useCallback((nextRegion) => {
    lastRegionRef.current = nextRegion;
  }, []);

  const handleCenterMap = (incident) => {
    const latitude = Number(incident?.location?.latitude);
    const longitude = Number(incident?.location?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    });
    clearSelectedIncident();
  };

  // List mode is only meaningful for resolved incidents. Active map incidents are
  // intentionally privacy-stripped by the backend (no title/severity/locationName),
  // so there is nothing useful to list — active mode always shows the map.
  const listAvailable = mapMode === MAP_MODES.RESOLVED;
  const showList = listAvailable && viewMode === "list";

  if (error && !loading && incidents.length === 0) {
    return (
      <View style={[mapStyles.centerContainer, { backgroundColor: theme.background }]}>
        <EmptyState
          illustration={EMPTY_ART.errorNetwork}
          title="Connection lost"
          message={error}
          actionLabel="Retry"
          onAction={() => fetchIncidents()} />

      </View>);

  }

  return (
    <View style={mapStyles.container}>
      {showList ?
      <MapList
        incidents={incidents}
        categoryDisplay={CATEGORY_DISPLAY}
        onSelectIncident={selectIncident}
        refreshing={refreshing}
        onRefresh={() => fetchIncidents(true)}
        contentPaddingTop={headerHeight + 8}
        contentPaddingBottom={tabBarHeight + 16} /> :

      <MapCanvas
        mapRef={mapRef}
        region={region}
        onRegionChange={handleRegionChangeComplete}
        showsUserLocation={preferences.locationServices}
        incidents={incidents}
        categoryDisplay={CATEGORY_DISPLAY}
        showActiveOverlays={mapMode === MAP_MODES.ACTIVE}
        onMarkerPress={handleMarkerPress} />
      }


      <View
        style={[mapStyles.filterHeader, { paddingTop: insets.top + 8 }]}
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>

        <View
          style={[
          mapStyles.controlPanel,
          { backgroundColor: `${theme.card}f0`, borderColor: theme.border, shadowColor: theme.shadow }]
          }>

          <View style={mapStyles.panelHeaderRow}>
            <View style={[mapStyles.segment, mapStyles.segmentFlex, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[mapStyles.segmentItem, mapMode === MAP_MODES.ACTIVE && { backgroundColor: theme.primary }]}
                onPress={() => setMapMode(MAP_MODES.ACTIVE)}
                activeOpacity={0.85}>

                <Ionicons
                  name="radio-button-on-outline"
                  size={14}
                  color={mapMode === MAP_MODES.ACTIVE ? '#fff' : theme.textSecondary} />

                <AppText
                  variant="caption"
                  style={[mapStyles.segmentLabel, { color: mapMode === MAP_MODES.ACTIVE ? '#fff' : theme.textSecondary }]}>

                  Active
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mapStyles.segmentItem, mapMode === MAP_MODES.RESOLVED && { backgroundColor: theme.primary }]}
                onPress={() => setMapMode(MAP_MODES.RESOLVED)}
                activeOpacity={0.85}>

                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={mapMode === MAP_MODES.RESOLVED ? '#fff' : theme.textSecondary} />

                <AppText
                  variant="caption"
                  style={[mapStyles.segmentLabel, { color: mapMode === MAP_MODES.RESOLVED ? '#fff' : theme.textSecondary }]}>

                  Resolved
                </AppText>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[mapStyles.collapseToggle, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={toggleFilters}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={filtersExpanded ? 'Collapse filters' : 'Expand filters'}
              accessibilityState={{ expanded: filtersExpanded }}>

              <Ionicons name={filtersExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {filtersExpanded ?
          <>
            <CategoryFilterBar
              categoryDisplay={CATEGORY_DISPLAY}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory} />


            <TimeframeSelector
              selectedTimeframe={selectedTimeframe}
              onSelectTimeframe={setSelectedTimeframe}
              includeAll={mapMode === MAP_MODES.RESOLVED} />

            {listAvailable ?
            <View style={[mapStyles.segment, mapStyles.viewModeSegment, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[mapStyles.segmentItem, viewMode === "map" && { backgroundColor: theme.primary }]}
                onPress={() => setViewMode("map")}
                activeOpacity={0.85}>

                <Ionicons name="map-outline" size={14} color={viewMode === "map" ? "#fff" : theme.textSecondary} />
                <AppText
                  variant="caption"
                  style={[mapStyles.segmentLabel, { color: viewMode === "map" ? "#fff" : theme.textSecondary }]}>

                  Map
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[mapStyles.segmentItem, viewMode === "list" && { backgroundColor: theme.primary }]}
                onPress={() => setViewMode("list")}
                activeOpacity={0.85}>

                <Ionicons name="list-outline" size={14} color={viewMode === "list" ? "#fff" : theme.textSecondary} />
                <AppText
                  variant="caption"
                  style={[mapStyles.segmentLabel, { color: viewMode === "list" ? "#fff" : theme.textSecondary }]}>

                  List
                </AppText>
              </TouchableOpacity>
            </View> :
            null}
          </> :
          null}

        </View>
      </View>

      {showMapHint && !showList ?
      <View
        style={[
        mapStyles.mapHintWrap,
        { top: headerHeight + 6, backgroundColor: `${theme.card}e8`, borderColor: theme.border }]
        }>

          <Ionicons
          name="finger-print-outline"
          size={16}
          color={theme.primary} />

          <AppText
          variant="caption"
          style={[mapStyles.mapHintText, { color: theme.textSecondary }]}>

            {mapMode === MAP_MODES.ACTIVE ?
          "Tap a circle to view the report category." :
          "Tap a marker to open incident details."}
          </AppText>
        </View> :
      null}

      {!showList ?
      <MapControls
        onShowLegend={() => setShowLegend(true)}
        onMyLocation={goToMyLocation}
        onResetRegion={resetToDefaultRegion}
        onRefresh={() => fetchIncidents(true)}
        locationLoading={locationLoading}
        refreshing={refreshing}
        incidentsCount={incidents.length} /> :
      null}


      {loading ?
      <View
        style={[
        mapStyles.loadingOverlay,
        { backgroundColor: `${theme.background}bf` }]
        }>

          <View
          style={[
          mapStyles.loadingContainer,
          { backgroundColor: theme.card }]
          }>

            <ActivityIndicator size="large" color={theme.mapMarkerDefault} />
            <AppText
            variant="body"
            style={[mapStyles.loadingText, { color: theme.text }]}>

              Loading incidents...
            </AppText>
          </View>
        </View> :
      null}

      <MapLegend
        visible={showLegend}
        onClose={() => setShowLegend(false)}
        categoryDisplay={CATEGORY_DISPLAY} />


      <IncidentMapDetail
        selectedIncident={selectedIncident}
        onClose={clearSelectedIncident}
        onCenterMap={handleCenterMap}
        categoryDisplay={CATEGORY_DISPLAY}
        showResolvedDetails={mapMode === MAP_MODES.RESOLVED}
        canCenter={!showList} />

    </View>);

};

export default MapScreen;