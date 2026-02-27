import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { incidentAPI } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import useUserPreferences from "../../hooks/useUserPreferences";
import incidentConstants from "../../../../constants/incident";
import useIncidentFilters from "../../hooks/useIncidentFilters";
import useMapRegion from "../../hooks/useMapRegion";
import { AppText, Button, MapLegend } from "../../components";
import CategoryFilterBar from "./CategoryFilterBar";
import IncidentMapDetail from "./IncidentMapDetail";
import MapControls from "./MapControls";
import MapCanvas from "./MapView";
import mapStyles from "./mapStyles";
import TimeframeSelector from "./TimeframeSelector";

const { CATEGORY_DISPLAY } = incidentConstants;
const MAP_HINT_STORAGE_KEY = "map_first_visit_hint_seen";

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
  const activeRequestId = useRef(0);

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showMapHint, setShowMapHint] = useState(true);

  const {
    selectedCategory,
    setSelectedCategory,
    selectedTimeframe,
    setSelectedTimeframe,
  } = useIncidentFilters({ defaultTimeframe: "30d" });

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

  const fetchIncidents = useCallback(
    async (isRefresh = false) => {
      const requestId = activeRequestId.current + 1;
      activeRequestId.current = requestId;

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
        if (activeRequestId.current !== requestId) {
          return;
        }

        if (!result.success) {
          setError(result.error || "Failed to load incidents");
          return;
        }

        // Status visibility is enforced by the backend map endpoint.
        // Client-side filtering here only guards against invalid coordinates.
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
          !preferences.locationServices
        ) {
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
    [preferences.locationServices, selectedCategory, selectedTimeframe],
  );

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

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
      longitudeDelta: 0.01,
    });
    clearSelectedIncident();
  };

  if (error && !loading && incidents.length === 0) {
    return (
      <View
        style={[
          mapStyles.centerContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <Ionicons name="alert-circle" size={64} color={theme.error} />
        <AppText
          variant="body"
          style={[mapStyles.errorText, { color: theme.textSecondary }]}
        >
          {error}
        </AppText>
        <Button
          title="Retry"
          onPress={() => fetchIncidents()}
          style={[
            mapStyles.retryButton,
            { backgroundColor: theme.mapMarkerDefault },
          ]}
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
        onMarkerPress={(incident) => {
          setShowMapHint(false);
          AsyncStorage.setItem(MAP_HINT_STORAGE_KEY, "1").catch(() => {});
          setSelectedIncident(incident);
        }}
      />

      <View
        style={[
          mapStyles.filterHeader,
          {
            paddingTop: insets.top + 8,
            backgroundColor: `${theme.card}00`,
          },
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

      {showMapHint ? (
        <View
          style={[
            mapStyles.mapHintWrap,
            { backgroundColor: `${theme.card}e8`, borderColor: theme.border },
          ]}
        >
          <Ionicons
            name="finger-print-outline"
            size={16}
            color={theme.primary}
          />
          <AppText
            variant="caption"
            style={[mapStyles.mapHintText, { color: theme.textSecondary }]}
          >
            Tap a marker to open incident details.
          </AppText>
        </View>
      ) : null}

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
        <View
          style={[
            mapStyles.loadingOverlay,
            { backgroundColor: `${theme.background}bf` },
          ]}
        >
          <View
            style={[
              mapStyles.loadingContainer,
              { backgroundColor: theme.card },
            ]}
          >
            <ActivityIndicator size="large" color={theme.mapMarkerDefault} />
            <AppText
              variant="body"
              style={[mapStyles.loadingText, { color: theme.text }]}
            >
              Loading incidents...
            </AppText>
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
