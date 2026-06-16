import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card, ConfirmModal, Modal as AppModal } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { savedAreaAPI, statsAPI } from '../../services/api';
import accountStyles from './accountStyles';

const clampScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const SavedAreasSection = () => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [areas, setAreas] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const [label, setLabel] = useState('');
  const [pendingCoords, setPendingCoords] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const handleAddPress = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission is needed to save an area.', 'warning');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setPendingCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLabel('');
      setAddVisible(true);
    } catch {
      showToast('Could not get your current location.', 'error');
    } finally {
      setLocating(false);
    }
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
        onPress={handleAddPress}
        loading={locating}
        disabled={locating}
        variant="secondary"
        style={styles.addButton}
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
});

export default SavedAreasSection;
