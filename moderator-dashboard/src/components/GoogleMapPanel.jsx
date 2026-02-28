import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleF,
  GoogleMap,
  HeatmapLayerF,
  MarkerClustererF,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";

const GOOGLE_MAPS_LIBRARIES = ["visualization"];
const FALLBACK_CENTER = { lat: 37.0902, lng: -95.7129 };
const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#111827" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#d1d5db" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#374151" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#111827" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca3af" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#374151" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2937" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d1d5db" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#111827" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0b1220" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#93c5fd" }],
  },
];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Build a custom teardrop-pin icon for Google Maps colored by severity.
 * Uses the SVG path symbol interface so no `new google.maps.Size/Point()` needed.
 */
const makePinIcon = (color) => ({
  // Material "place" icon path, viewBox 0 0 24 24
  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
  fillColor: color,
  fillOpacity: 1,
  strokeColor: "rgba(255,255,255,0.85)",
  strokeWeight: 1.5,
  scale: 1.9,
  anchor: { x: 12, y: 22 },
  labelOrigin: { x: 12, y: 9 },
});

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("GoogleMapPanel error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Map failed to render.
        </div>
      );
    }

    return this.props.children;
  }
}

function GoogleMapPanelContent({
  markers = [],
  center = null,
  height = 220,
  zoom = 13,
  radiusMeters = null,
  showClusters = false,
  showHeatmap = false,
  autoFit = true,
  emptyMessage = "No location data available.",
}) {
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    Boolean(
      typeof document !== "undefined" &&
      document.documentElement?.classList.contains("dark"),
    ),
  );
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({
    id: "safesignal-google-maps-script",
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (typeof MutationObserver === "undefined") return undefined;

    const root = document.documentElement;
    if (!root) return undefined;

    setIsDarkMode(root.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDarkMode(root.classList.contains("dark"));
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const validMarkers = useMemo(() => {
    return markers
      .map((marker, index) => ({
        id: marker.id || `${index}-${marker.title || "marker"}`,
        lat: toNumber(marker.lat ?? marker.latitude),
        lng: toNumber(marker.lng ?? marker.longitude),
        title: marker.title || "Incident",
        weight: Number.isFinite(Number(marker.weight))
          ? Number(marker.weight)
          : 1,
        color: marker.color || null,
        label: marker.label || null,
        meta: marker.meta || null,
      }))
      .filter((marker) => marker.lat !== null && marker.lng !== null);
  }, [markers]);

  const effectiveCenter = useMemo(() => {
    const centerLat = toNumber(center?.lat ?? center?.latitude);
    const centerLng = toNumber(center?.lng ?? center?.longitude);
    if (centerLat !== null && centerLng !== null) {
      return { lat: centerLat, lng: centerLng };
    }
    if (validMarkers.length > 0) {
      return { lat: validMarkers[0].lat, lng: validMarkers[0].lng };
    }
    return FALLBACK_CENTER;
  }, [center, validMarkers]);

  const canRenderHeatmap = useMemo(
    () =>
      Boolean(
        isLoaded &&
        typeof window !== "undefined" &&
        window.google?.maps?.visualization?.HeatmapLayer,
      ),
    [isLoaded],
  );

  const renderClusteredMarkers = useCallback(
    (clusterer) => (
      <>
        {validMarkers.map((marker) => (
          <MarkerF
            key={marker.id}
            clusterer={clusterer}
            position={{ lat: marker.lat, lng: marker.lng }}
            title={marker.title}
            icon={marker.color ? makePinIcon(marker.color) : undefined}
            label={
              marker.color && marker.label
                ? { text: marker.label, color: "white", fontSize: "9px", fontWeight: "900", fontFamily: "Arial,sans-serif" }
                : undefined
            }
            onClick={() => setActiveMarkerId(marker.id)}
          />
        ))}
      </>
    ),
    [validMarkers],
  );

  const activeMarker = useMemo(
    () => validMarkers.find((m) => m.id === activeMarkerId) ?? null,
    [validMarkers, activeMarkerId],
  );

  const heatmapData = useMemo(() => {
    if (!showHeatmap || !canRenderHeatmap || validMarkers.length === 0) {
      return [];
    }
    return validMarkers.map((marker) => ({
      location: new window.google.maps.LatLng(marker.lat, marker.lng),
      weight: marker.weight,
    }));
  }, [canRenderHeatmap, showHeatmap, validMarkers]);

  const panelStyle = useMemo(
    () => ({
      height: typeof height === "number" ? `${height}px` : height,
      minHeight: typeof height === "number" ? `${height}px` : height,
    }),
    [height],
  );

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      const zoomIn = document.querySelector('button[title="Zoom in"]');
      const zoomOut = document.querySelector('button[title="Zoom out"]');
      if (zoomIn) zoomIn.setAttribute("aria-label", "Zoom in");
      if (zoomOut) zoomOut.setAttribute("aria-label", "Zoom out");
    }, 1000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (!googleMapsApiKey) {
    return (
      <div
        className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        style={panelStyle}
      >
        Google Maps unavailable. Set `VITE_GOOGLE_MAPS_API_KEY` in
        `moderator-dashboard/.env`.
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        style={panelStyle}
      >
        Failed to load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="border border-border bg-surface p-3 text-sm text-muted"
        style={panelStyle}
      >
        Loading map...
      </div>
    );
  }

  if (validMarkers.length === 0) {
    return (
      <div
        className="border border-border bg-surface p-3 text-sm text-muted"
        style={panelStyle}
      >
        {emptyMessage}
      </div>
    );
  }

  const mapContainerStyle = { width: "100%", height };
  const shouldDrawRadius =
    Number.isFinite(Number(radiusMeters)) && Number(radiusMeters) > 0;
  const mapOptions = {
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    styles: isDarkMode ? DARK_MAP_STYLES : undefined,
  };

  const onMapLoad = (map) => {
    if (!autoFit) {
      return;
    }

    if (shouldDrawRadius) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(effectiveCenter);
      const circle = new window.google.maps.Circle({
        center: effectiveCenter,
        radius: Number(radiusMeters),
      });
      const circleBounds = circle.getBounds();
      if (circleBounds) {
        bounds.union(circleBounds);
      }
      map.fitBounds(bounds);
      return;
    }

    if (validMarkers.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      validMarkers.forEach((marker) => {
        bounds.extend({ lat: marker.lat, lng: marker.lng });
      });
      map.fitBounds(bounds);
    }
  };

  return (
    <div
      className="overflow-hidden border border-border bg-card"
      style={{ ...panelStyle, position: "relative" }}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={effectiveCenter}
        zoom={zoom}
        onLoad={onMapLoad}
        options={mapOptions}
        onClick={() => setActiveMarkerId(null)}
      >
        {showHeatmap && canRenderHeatmap && heatmapData.length > 0 && (
          <HeatmapLayerF
            data={heatmapData}
            options={{
              radius: 40,
              opacity: 0.7,
            }}
          />
        )}

        {showClusters ? (
          <MarkerClustererF>
            {renderClusteredMarkers}
          </MarkerClustererF>
        ) : (
          <>
            {validMarkers.map((marker) => (
              <MarkerF
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                title={marker.title}
                icon={marker.color ? makePinIcon(marker.color) : undefined}
                label={
                  marker.color && marker.label
                    ? { text: marker.label, color: "white", fontSize: "9px", fontWeight: "900", fontFamily: "Arial,sans-serif" }
                    : undefined
                }
                onClick={() => setActiveMarkerId(marker.id)}
              />
            ))}
          </>
        )}

        {shouldDrawRadius && (
          <CircleF
            center={effectiveCenter}
            radius={Number(radiusMeters)}
            options={{
              fillColor: "#2563eb",
              fillOpacity: 0.12,
              strokeColor: "#2563eb",
              strokeOpacity: 0.7,
              strokeWeight: 1,
            }}
          />
        )}

      </GoogleMap>

      {/* Custom incident popup — overlaid on map, avoids Maps API InfoWindow library */}
      {activeMarker && (
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 16,
            zIndex: 10,
            fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
            background: "#141e2d",
            color: "#d9e4f0",
            borderRadius: 8,
            padding: "12px 14px",
            minWidth: 230,
            maxWidth: 300,
            boxShadow: "0 4px 20px rgba(0,0,0,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* Header row: severity badge + ID + close */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            {activeMarker.meta?.severityColor && (
              <span style={{
                background: activeMarker.meta.severityColor,
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                padding: "2px 7px",
                borderRadius: 4,
                flexShrink: 0,
              }}>
                {activeMarker.meta.severityLabel}
              </span>
            )}
            <span style={{ fontSize: 10, color: "#5c7390", letterSpacing: "0.04em", flex: 1 }}>
              #{activeMarker.meta?.incidentId ?? "—"}
            </span>
            <button
              onClick={() => setActiveMarkerId(null)}
              style={{
                background: "none",
                border: "none",
                color: "#5c7390",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                padding: "0 2px",
                flexShrink: 0,
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Title */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#d9e4f0", lineHeight: 1.35, marginBottom: 8, wordBreak: "break-word" }}>
            {activeMarker.meta?.title ?? activeMarker.title}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 7 }} />

          {/* Meta rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{ color: "#5c7390", minWidth: 52 }}>Type</span>
              <span style={{
                background: "rgba(255,255,255,0.09)",
                borderRadius: 3,
                padding: "1px 6px",
                fontSize: 10,
                fontWeight: 800,
                color: "#d9e4f0",
                marginRight: 4,
              }}>
                {activeMarker.meta?.categoryLabel}
              </span>
              <span style={{ color: "#8baabf" }}>{activeMarker.meta?.categoryName}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span style={{ color: "#5c7390", minWidth: 52 }}>Status</span>
              <span style={{ color: "#8baabf", textTransform: "capitalize" }}>{activeMarker.meta?.status ?? "—"}</span>
            </div>
            {activeMarker.meta?.date && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <span style={{ color: "#5c7390", minWidth: 52 }}>Date</span>
                <span style={{ color: "#8baabf" }}>
                  {new Date(activeMarker.meta.date).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleMapPanel(props) {
  return (
    <MapErrorBoundary>
      <GoogleMapPanelContent {...props} />
    </MapErrorBoundary>
  );
}

export default GoogleMapPanel;
