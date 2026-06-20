import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, Card, ConfirmModal, Modal as AppModal } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { savedAreaAPI, statsAPI } from '../../services/api';
import accountStyles from './accountStyles';

const DEFAULT_REGION = {
  latitude: 33.8938,
  longitude: 35.5018,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const clampScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const SavedAreasSection = () => {
  const { theme, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [areas, setAreas] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const [label, setLabel] = useState('');
  const [pendingCoords, setPendingCoords] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [mapSelection, setMapSelection] = useState(null);

  const scoreColor = (score) =>
    score >= 80 ? theme.safetyGood : score >= 60 ? theme.safetyModerate : theme.safetyPoor;

  const fetchScore = useCallback(async (area) => {
    const res = await statsAPI.getDashboardStats({
      latitude: Number(area.latitude),
      longitude: Number(area.longitude),
      radius: Number(area.radius_km) || 1,
    });
    const score = res.success ? clampScore(res.data?.safetyScore?.score) : null;
    setScores((prev) => ({ ...prev, [area.area_id]: score }));
  }, []);

  const loadAreas = useCallback(async () => {
    const res = await savedAreaAPI.list();
    setLoading(false);
    if (!res.success) {
      showToast(res.error || 'Failed to load saved areas', 'error');
      return;
    }
    setAreas(res.areas);
    res.areas.forEach(fetchScore);
  }, [fetchScore, showToast]);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  const openNamingModal = (coords) => {
    setPendingCoords(coords);
    setLabel('');
    setAddVisible(true);
  };

  const handleUseCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission is needed to save an area.', 'warning');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      openNamingModal({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      showToast('Could not get your current location.', 'error');
    } finally {
      setLocating(false);
    }
  };

  const handleChooseOnMap = async () => {
    let region = DEFAULT_REGION;
    let selection = null;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const last = await Location.getLastKnownPositionAsync();
        if (last?.coords) {
          const { latitude, longitude } = last.coords;
          region = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
          selection = { latitude, longitude };
        }
      }
    } catch {}
    setMapRegion(region);
    setMapSelection(selection);
    setMapVisible(true);
  };

  const handleMapPress = (event) => {
    setMapSelection(event.nativeEvent.coordinate);
  };

  const handleConfirmMapLocation = () => {
    if (!mapSelection) return;
    setMapVisible(false);
    openNamingModal(mapSelection);
  };

  const handleSave = async () => {
    if (!pendingCoords || saving) return;
    setSaving(true);
    const res = await savedAreaAPI.create({
      label: label.trim() || 'Saved area',
      latitude: pendingCoords.latitude,
      longitude: pendingCoords.longitude,
      radiusKm: 1,
    });
    setSaving(false);
    if (!res.success) {
      showToast(res.error || 'Failed to save area', 'error');
      return;
    }
    setAddVisible(false);
    setPendingCoords(null);
    setAreas((prev) => [res.area, ...prev]);
    fetchScore(res.area);
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    const res = await savedAreaAPI.remove(target.area_id);
    if (!res.success) {
      showToast(res.error || 'Failed to delete area', 'error');
      return;
    }
    setAreas((prev) => prev.filter((area) => area.area_id !== target.area_id));
  };

  return (
    <Card style={[accountStyles.settingsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <AppText variant="h4" style={[accountStyles.sectionTitle, { color: theme.text }]}>Saved areas</AppText>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : areas.length === 0 ? (
        <AppText variant="caption" style={[styles.empty, { color: theme.textSecondary }]}>
          Save places you care about (home, work, a relative's) to see each area's activity score.
        </AppText>
      ) : (
        areas.map((area) => {
          const score = scores[area.area_id];
          return (
            <View key={area.area_id} style={[styles.row, { borderBottomColor: theme.divider }]}>
              <View style={styles.info}>
                <AppText variant="label" style={{ color: theme.text }} numberOfLines={1}>{area.label}</AppText>
                <AppText variant="caption" style={{ color: theme.textSecondary }}>
                  {Number(area.radius_km) || 1} km radius
                </AppText>
              </View>
              {score === undefined ? (
                <ActivityIndicator size="small" color={theme.textTertiary} style={styles.scoreSlot} />
              ) : score === null ? (
                <AppText variant="caption" style={[styles.scoreSlot, { color: theme.textTertiary }]}>—</AppText>
              ) : (
                <View style={[styles.scorePill, { backgroundColor: `${scoreColor(score)}1f` }]}>
                  <AppText variant="caption" style={{ color: scoreColor(score) }}>{score}</AppText>
                </View>
              )}
              <TouchableOpacity
                onPress={() => setDeleteTarget(area)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${area.label}`}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      <Button
        title={locating ? 'Getting location…' : 'Add current location'}
        onPress={handleUseCurrentLocation}
        loading={locating}
        disabled={locating}
        variant="secondary"
        style={styles.addButton}
      />
      <Button
        title="Choose on map"
        onPress={handleChooseOnMap}
        disabled={locating}
        variant="secondary"
        style={styles.mapButton}
      />

      <AppModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        contentStyle={[accountStyles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <AppText variant="h4" style={[accountStyles.modalTitle, { color: theme.text }]}>Name this area</AppText>
        <TextInput
          style={[accountStyles.modalInput, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Home, Work"
          placeholderTextColor={theme.inputPlaceholder}
          autoFocus
        />
        <View style={accountStyles.modalActions}>
          <Button title="Cancel" onPress={() => setAddVisible(false)} variant="secondary" style={accountStyles.modalButton} />
          <Button title="Save" onPress={handleSave} loading={saving} disabled={saving} style={accountStyles.modalButton} />
        </View>
      </AppModal>

      <Modal visible={mapVisible} animationType="slide" onRequestClose={() => setMapVisible(false)}>
        <View style={[styles.mapModalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.mapModalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border, paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => setMapVisible(false)}>
              <AppText variant="body" style={{ color: theme.textSecondary }}>Cancel</AppText>
            </TouchableOpacity>
            <AppText variant="h4" style={{ color: theme.text }}>Choose location</AppText>
            <TouchableOpacity onPress={handleConfirmMapLocation} disabled={!mapSelection}>
              <AppText variant="label" style={{ color: mapSelection ? theme.primary : theme.textTertiary }}>Confirm</AppText>
            </TouchableOpacity>
          </View>

          <MapView
            style={styles.fullMap}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            onPress={handleMapPress}
          >
            {mapSelection && (
              <Marker coordinate={mapSelection} draggable onDragEnd={handleMapPress} />
            )}
          </MapView>

          <View
            style={[
              styles.mapInstructions,
              {
                backgroundColor: isDark ? 'rgba(17,24,39,0.9)' : 'rgba(255,255,255,0.9)',
                shadowColor: theme.shadow,
                bottom: insets.bottom + 20,
              },
            ]}
          >
            <AppText variant="caption" style={[styles.mapInstructionsText, { color: theme.text }]}>
              Tap the map or drag the marker to choose an area to watch
            </AppText>
            {mapSelection && (
              <AppText variant="small" style={[styles.mapInstructionsText, { color: theme.primary }]}>
                {mapSelection.latitude.toFixed(5)}, {mapSelection.longitude.toFixed(5)}
              </AppText>
            )}
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete saved area"
        message={`Stop watching "${deleteTarget?.label || 'this area'}"?`}
        actions={[
          { text: 'Cancel', style: 'cancel', onPress: () => setDeleteTarget(null) },
          { text: 'Delete', style: 'destructive', onPress: handleDelete },
        ]}
        onRequestClose={() => setDeleteTarget(null)}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  loader: {
    paddingVertical: 12,
  },
  empty: {
    lineHeight: 18,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  scoreSlot: {
    width: 36,
    textAlign: 'center',
  },
  scorePill: {
    minWidth: 36,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: 'center',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  addButton: {
    marginTop: 14,
  },
  mapButton: {
    marginTop: 10,
  },
  mapModalContainer: {
    flex: 1,
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  fullMap: {
    flex: 1,
  },
  mapInstructions: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapInstructionsText: {
    textAlign: 'center',
  },
});

export default SavedAreasSection;
