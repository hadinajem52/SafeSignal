import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../context/ThemeContext';

/**
 * Static mini-map preview of an incident's location for the detail screen.
 * Non-interactive (the parent ScrollView scrolls over it).
 *
 * The coordinates are already fuzzed-or-exact as decided server-side. When
 * `approximate` is set (location was fuzzed), we draw a soft radius circle to
 * signal "approximate area" instead of a precise pin.
 */
export default function IncidentLocationMap({
  latitude,
  longitude,
  color,
  approximate = false,
  height = 160,
  style,
}) {
  const { theme } = useTheme();
  const coordinate = { latitude, longitude };
  const delta = approximate ? 0.02 : 0.008;
  const pinColor = color || theme.primary;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { height, borderColor: theme.border, backgroundColor: theme.surface }, style]}
    >
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        // Android lite mode renders a cheap static map snapshot instead of a live GL
        // map — ideal here since the preview is fully non-interactive. Gated to the
        // marker (exact) case: lite mode doesn't reliably draw the approximate-area
        // Circle overlay, so fuzzed locations keep the full map.
        liteMode={Platform.OS === 'android' && !approximate}
        region={{ latitude, longitude, latitudeDelta: delta, longitudeDelta: delta }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        loadingEnabled
        loadingIndicatorColor={theme.primary}
        loadingBackgroundColor={theme.surface}
      >
        {approximate ? (
          <Circle
            center={coordinate}
            radius={300}
            strokeColor={`${pinColor}AA`}
            fillColor={`${pinColor}33`}
            strokeWidth={2}
          />
        ) : (
          <Marker coordinate={coordinate} pinColor={pinColor} />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
});
