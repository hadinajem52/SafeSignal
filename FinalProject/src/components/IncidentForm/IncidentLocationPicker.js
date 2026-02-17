import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { AppText } from '../../components';
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
      <AppText variant="label" style={[styles.label, { color: theme.text }]}>Location *</AppText>
      
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
              <Ionicons name="locate-outline" size={16} color="#FFFFFF" style={styles.locationIcon} />
              <AppText variant="buttonSmall" style={styles.locationButtonText}>
                {location ? 'Update Location' : 'Use GPS'}
              </AppText>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mapSelectButton, { backgroundColor: theme.card, borderColor: theme.primary }]}
          onPress={onOpenMap}
        >
          <Ionicons name="map-outline" size={16} color={theme.primary} style={styles.locationIcon} />
          <AppText variant="buttonSmall" style={[styles.mapSelectButtonText, { color: theme.primary }]}>Select on Map</AppText>
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
              <AppText variant="bodySmall" style={[styles.locationNameText, { color: theme.text }]}>{locationName}</AppText>
            ) : null}
            <AppText variant="small" style={[styles.coordinatesText, { color: theme.textSecondary }]}> 
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </AppText>
          </View>
        </View>
      )}
      
      {error && <AppText variant="small" style={[styles.errorText, { color: theme.error }]}>{error}</AppText>}
      <AppText variant="small" style={[styles.helperText, { color: theme.textSecondary }]}> 
        Your exact location will be slightly randomized for privacy
      </AppText>

      {/* Map Selection Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={onCloseMapModal}
      >
        <View style={[styles.mapModalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.mapModalHeader, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
            <TouchableOpacity onPress={onCloseMapModal}>
              <AppText variant="body" style={[styles.mapModalCancel, { color: theme.textSecondary }]}>Cancel</AppText>
            </TouchableOpacity>
            <AppText variant="h4" style={[styles.mapModalTitle, { color: theme.text }]}>Select Location</AppText>
            <TouchableOpacity onPress={onConfirmMapLocation}>
              <AppText variant="label" style={[styles.mapModalConfirm, { color: theme.primary }]}>Confirm</AppText>
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
            <AppText variant="caption" style={[styles.mapInstructionsText, { color: theme.text }]}> 
              Tap on the map or drag the marker to select the incident location
            </AppText>
            {selectedMapLocation && (
              <AppText variant="small" style={[styles.selectedLocationText, { color: theme.primary }]}> 
                Selected: {selectedMapLocation.latitude.toFixed(6)}, {selectedMapLocation.longitude.toFixed(6)}
              </AppText>
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
    marginBottom: 8,
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
    marginRight: 8,
    color: '#fff',
  },
  locationButtonText: {
    color: '#fff',
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
    marginBottom: 4,
  },
  coordinatesText: {
  },
  errorText: {
    marginTop: 4,
  },
  helperText: {
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
  },
  mapModalCancel: {
  },
  mapModalConfirm: {
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
  },
});

export default IncidentLocationPicker;
