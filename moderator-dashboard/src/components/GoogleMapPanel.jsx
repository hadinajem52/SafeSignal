import React, { useEffect, useMemo, useState } from 'react'
import {
  CircleF,
  GoogleMap,
  HeatmapLayerF,
  MarkerClustererF,
  MarkerF,
  useJsApiLoader,
} from '@react-google-maps/api'

const GOOGLE_MAPS_LIBRARIES = ['visualization']
const FALLBACK_CENTER = { lat: 37.0902, lng: -95.7129 }
const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#d1d5db' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1f2937' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#d1d5db' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#93c5fd' }] },
]

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('GoogleMapPanel error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Map failed to render.
        </div>
      )
    }

    return this.props.children
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
  emptyMessage = 'No location data available.',
}) {
  const [isDarkMode, setIsDarkMode] = useState(() =>
    Boolean(
      typeof document !== 'undefined' &&
      document.documentElement?.classList.contains('dark')
    )
  )
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'safesignal-google-maps-script',
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    if (typeof MutationObserver === 'undefined') return undefined

    const root = document.documentElement
    if (!root) return undefined

    setIsDarkMode(root.classList.contains('dark'))

    const observer = new MutationObserver(() => {
      setIsDarkMode(root.classList.contains('dark'))
    })

    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const validMarkers = useMemo(() => {
    return markers
      .map((marker, index) => ({
        id: marker.id || `${index}-${marker.title || 'marker'}`,
        lat: toNumber(marker.lat ?? marker.latitude),
        lng: toNumber(marker.lng ?? marker.longitude),
        title: marker.title || 'Incident',
        weight: Number.isFinite(Number(marker.weight)) ? Number(marker.weight) : 1,
      }))
      .filter((marker) => marker.lat !== null && marker.lng !== null)
  }, [markers])

  const effectiveCenter = useMemo(() => {
    const centerLat = toNumber(center?.lat ?? center?.latitude)
    const centerLng = toNumber(center?.lng ?? center?.longitude)
    if (centerLat !== null && centerLng !== null) {
      return { lat: centerLat, lng: centerLng }
    }
    if (validMarkers.length > 0) {
      return { lat: validMarkers[0].lat, lng: validMarkers[0].lng }
    }
    return FALLBACK_CENTER
  }, [center, validMarkers])

  const canRenderHeatmap = useMemo(
    () =>
      Boolean(
        isLoaded &&
        typeof window !== 'undefined' &&
        window.google?.maps?.visualization?.HeatmapLayer
      ),
    [isLoaded]
  )

  const heatmapData = useMemo(() => {
    if (!showHeatmap || !canRenderHeatmap || validMarkers.length === 0) {
      return []
    }
    return validMarkers.map((marker) => ({
      location: new window.google.maps.LatLng(marker.lat, marker.lng),
      weight: marker.weight,
    }))
  }, [canRenderHeatmap, showHeatmap, validMarkers])

  if (!googleMapsApiKey) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Google Maps unavailable. Set `VITE_GOOGLE_MAPS_API_KEY` in `moderator-dashboard/.env`.
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        Failed to load Google Maps.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        Loading map...
      </div>
    )
  }

  if (validMarkers.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        {emptyMessage}
      </div>
    )
  }

  const mapContainerStyle = { width: '100%', height }
  const shouldDrawRadius = Number.isFinite(Number(radiusMeters)) && Number(radiusMeters) > 0
  const mapOptions = {
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    styles: isDarkMode ? DARK_MAP_STYLES : undefined,
  }

  const onMapLoad = (map) => {
    if (!autoFit) {
      return
    }

    if (shouldDrawRadius) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(effectiveCenter)
      const circle = new window.google.maps.Circle({
        center: effectiveCenter,
        radius: Number(radiusMeters),
      })
      const circleBounds = circle.getBounds()
      if (circleBounds) {
        bounds.union(circleBounds)
      }
      map.fitBounds(bounds)
      return
    }

    if (validMarkers.length > 1) {
      const bounds = new window.google.maps.LatLngBounds()
      validMarkers.forEach((marker) => {
        bounds.extend({ lat: marker.lat, lng: marker.lng })
      })
      map.fitBounds(bounds)
    }
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={effectiveCenter}
        zoom={zoom}
        onLoad={onMapLoad}
        options={mapOptions}
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
            {(clusterer) => (
              <>
                {validMarkers.map((marker) => (
                  <MarkerF
                    key={marker.id}
                    clusterer={clusterer}
                    position={{ lat: marker.lat, lng: marker.lng }}
                    title={marker.title}
                  />
                ))}
              </>
            )}
          </MarkerClustererF>
        ) : (
          <>
            {validMarkers.map((marker) => (
              <MarkerF
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                title={marker.title}
              />
            ))}
          </>
        )}

        {shouldDrawRadius && (
          <CircleF
            center={effectiveCenter}
            radius={Number(radiusMeters)}
            options={{
              fillColor: '#2563eb',
              fillOpacity: 0.12,
              strokeColor: '#2563eb',
              strokeOpacity: 0.7,
              strokeWeight: 1,
            }}
          />
        )}
      </GoogleMap>
    </div>
  )
}

function GoogleMapPanel(props) {
  return (
    <MapErrorBoundary>
      <GoogleMapPanelContent {...props} />
    </MapErrorBoundary>
  )
}

export default GoogleMapPanel
