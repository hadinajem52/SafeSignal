import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../../context/ThemeContext';

const IncidentLocationPicker = ({
  location,
  locationName,
  isLoadingLocation,
  onGetCurrentLocation,
  onOpenMap,
  error,
  showMapModal,
  onCloseMapModal,
  onConfirmMapLocation,
  mapRegion,
  onMapRegionChange,
  selectedMapLocation,
  onMapPress,
  mapRef,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.text }]}>
        Location <Text style={[styles.required, { color: theme.error }]}>*</Text>
      </Text>
      
      <View style={styles.locationButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.locationButton,
            { backgroundColor: theme.primary },
            location && [styles.locationButtonActive, { backgroundColor: theme.info }],
          ]}
          onPress={onGetCurrentLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationButtonText}>
                {location ? 'Update Location' : 'Use GPS'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mapSelectButton, { backgroundColor: theme.card, borderColor: theme.primary }]}
          onPress={onOpenMap}
        >
          <Text style={[styles.locationIcon, { color: theme.primary }]}>🗺️</Text>
          <Text style={[styles.mapSelectButtonText, { color: theme.primary }]}>Select on Map</Text>
        </TouchableOpacity>
      </View>

      {location && (
        <View style={[styles.locationPreview, { borderColor: theme.inputBorder }]}>
          <MapView
            style={styles.miniMap}
            region={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker coordinate={location} />
          </MapView>
          <View style={[styles.locationDetails, { backgroundColor: theme.card }]}>
            {locationName ? (
              <Text style={[styles.locationNameText, { color: theme.text }]}>{locationName}</Text>
            ) : null}
            <Text style={[styles.coordinatesText, { color: theme.textSecondary }]}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
      )}
      
      {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
      <Text style={[styles.helperText, { color: theme.textSecondary }]}>
        Your exact location will be slightly randomized for privacy
      </Text>

      {/* Map Selection Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={onCloseMapModal}
      >
        <View style={[styles.mapModalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.mapModalHeader, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
            <TouchableOpacity onPress={onCloseMapModal}>
              <Text style={[styles.mapModalCancel, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.mapModalTitle, { color: theme.text }]}>Select Location</Text>
            <TouchableOpacity onPress={onConfirmMapLocation}>
              <Text style={[styles.mapModalConfirm, { color: theme.primary }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
          
          <MapView
            ref={mapRef}
            style={styles.fullMap}
            region={mapRegion}
            onRegionChangeComplete={onMapRegionChange}
            onPress={onMapPress}
          >
            {selectedMapLocation && (
              <Marker
                coordinate={selectedMapLocation}
                draggable
                onDragEnd={(e) => onMapPress(e)}
              />
            )}
          </MapView>
          
          <View
            style={[
              styles.mapInstructions,
              {
                backgroundColor: isDark ? 'rgba(17,24,39,0.9)' : 'rgba(255,255,255,0.9)',
                shadowColor: theme.shadow,
              },
            ]}
          >
            <Text style={[styles.mapInstructionsText, { color: theme.text }]}>
              Tap on the map or drag the marker to select the incident location
            </Text>
            {selectedMapLocation && (
              <Text style={[styles.selectedLocationText, { color: theme.primary }]}>
                Selected: {selectedMapLocation.latitude.toFixed(6)}, {selectedMapLocation.longitude.toFixed(6)}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  locationButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  locationButtonActive: {
    opacity: 0.92,
  },
  locationIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#fff',
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapSelectButton: {
    flex: 1,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  mapSelectButtonText: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '600',
  },
  locationPreview: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 8,
  },
  miniMap: {
    height: 150,
    width: '100%',
  },
  locationDetails: {
    padding: 12,
  },
  locationNameText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 12,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  mapModalContainer: {
    flex: 1,
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapModalCancel: {
    fontSize: 16,
  },
  mapModalConfirm: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullMap: {
    flex: 1,
  },
  mapInstructions: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapInstructionsText: {
    textAlign: 'center',
    marginBottom: 5,
  },
  selectedLocationText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default IncidentLocationPicker;
