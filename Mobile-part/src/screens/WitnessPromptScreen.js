import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button, Card } from '../components';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import useWitnessPromptSubmission from '../hooks/useWitnessPromptSubmission';
import { constellationAPI, NOTE_MAX_LENGTH } from '../services/constellationAPI';

const SIGNALS = [
  { type: 'saw_something', label: 'Saw something similar', icon: 'eye-outline' },
  { type: 'heard_something', label: 'Heard something unusual', icon: 'ear-outline' },
  { type: 'nothing_unusual', label: 'Passed by, nothing unusual', icon: 'walk-outline' },
  { type: 'already_left', label: 'Already left the area', icon: 'exit-outline' },
  { type: 'not_sure', label: 'Not sure', icon: 'help-circle-outline' },
];

const toCoarseCoordinate = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return Number(parsed.toFixed(2));
};

const getParam = (params, ...keys) => {
  for (const key of keys) {
    if (params?.[key] !== undefined && params?.[key] !== null) {
      return params[key];
    }
  }
  return undefined;
};

const getCoarseAnchor = (params, status) => {
  const latitude = getParam(params, 'coarseLatitude', 'coarse_latitude', 'centerLatitude');
  const longitude = getParam(params, 'coarseLongitude', 'coarse_longitude', 'centerLongitude');
  const statusLatitude = status?.centerLatitude;
  const statusLongitude = status?.centerLongitude;

  const coarseLatitude = toCoarseCoordinate(latitude ?? statusLatitude, -90, 90);
  const coarseLongitude = toCoarseCoordinate(longitude ?? statusLongitude, -180, 180);

  if (coarseLatitude === null || coarseLongitude === null) {
    return null;
  }

  return { latitude: coarseLatitude, longitude: coarseLongitude };
};

const WitnessPromptScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const constellationId = route?.params?.constellationId || route?.params?.constellation_id;
  const isSimulation = route?.params?.simulation === true;
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(!isSimulation && Boolean(constellationId));
  const [loadError, setLoadError] = useState(null);
  const { submitting, error, setError, submit } = useWitnessPromptSubmission({
    constellationId,
    onSuccess: () => {
      showToast('Thanks. Your response was recorded.', 'success');
      navigation.goBack();
    },
  });

  const coarseAnchor = useMemo(
    () => getCoarseAnchor(route?.params, status),
    [route?.params, status]
  );

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      if (isSimulation) {
        // Simulation preview: skip the backend lookup entirely. Best-effort fill the
        // coarse map anchor from the cached location (instant, no GPS acquisition).
        setLoadingStatus(false);
        setLoadError(null);
        try {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (active && lastKnown?.coords) {
            setStatus({
              centerLatitude: Number(lastKnown.coords.latitude.toFixed(2)),
              centerLongitude: Number(lastKnown.coords.longitude.toFixed(2)),
            });
          }
        } catch {
          // No cached location or permission — the screen shows the no-map fallback.
        }
        return;
      }

      if (!constellationId) {
        setLoadingStatus(false);
        setLoadError('This witness prompt is missing an identifier.');
        return;
      }

      const result = await constellationAPI.getConstellationStatus(constellationId);
      if (!active) {
        return;
      }

      if (result.success) {
        setStatus(result.data);
        setLoadError(null);
      } else {
        setLoadError(result.error);
      }
      setLoadingStatus(false);
    };

    loadStatus();

    return () => {
      active = false;
    };
  }, [constellationId, isSimulation]);

  const handleSubmit = async () => {
    if (!selectedSignal) {
      setError('Choose a response before submitting.');
      return;
    }

    if (isSimulation) {
      // Nothing is sent in simulation mode; just confirm and close.
      showToast('Simulation only — your response was not sent.', 'success');
      navigation.goBack();
      return;
    }

    const result = await submit({ signalType: selectedSignal, note });
    if (!result.success && result.error) {
      showToast(result.error, 'error');
    }
  };

  const renderMapAnchor = () => {
    if (!coarseAnchor) {
      return (
        <Card style={[styles.noMapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Ionicons name="location-outline" size={20} color={theme.textSecondary} />
          <AppText variant="bodySmall" style={[styles.noMapText, { color: theme.textSecondary }]}> 
            Approximate area will appear here when coarse coordinates are available.
          </AppText>
        </Card>
      );
    }

    return (
      <View style={[styles.mapShell, { borderColor: theme.border }]}> 
        <MapView
          pointerEvents="none"
          style={styles.map}
          region={{
            latitude: coarseAnchor.latitude,
            longitude: coarseAnchor.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
        >
          <Circle
            center={coarseAnchor}
            radius={500}
            strokeColor={`${theme.primary}88`}
            fillColor={`${theme.primary}22`}
          />
          <Marker coordinate={coarseAnchor} />
        </MapView>
        <View style={[styles.mapCaption, { backgroundColor: theme.card }]}> 
          <AppText variant="bodySmall" style={{ color: theme.textSecondary }}>
            Approximate area only, rounded to two decimals.
          </AppText>
        </View>
      </View>
    );
  };

  if (loadingStatus) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}> 
        <ActivityIndicator color={theme.primary} />
        <AppText variant="body" style={[styles.loadingText, { color: theme.textSecondary }]}> 
          Loading witness prompt...
        </AppText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>

        <View style={styles.headerBlock}>
          <View style={[styles.iconBadge, { backgroundColor: `${theme.primary}18` }]}> 
            <Ionicons name="radio-outline" size={24} color={theme.primary} />
          </View>
          <AppText variant="h2" style={[styles.title, { color: theme.text }]}> 
            Did you notice anything unusual nearby?
          </AppText>
          <AppText variant="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your response helps clarify nearby activity. We do not show reporter details, exact movement, or witness notes.
          </AppText>
          {isSimulation ? (
            <View style={[styles.simulationBadge, { backgroundColor: `${theme.warning}1A`, borderColor: `${theme.warning}55` }]}>
              <Ionicons name="flask-outline" size={14} color={theme.warning} />
              <AppText variant="caption" style={{ color: theme.warning }}>
                Simulation preview — nothing is sent.
              </AppText>
            </View>
          ) : null}
        </View>

        {loadError ? (
          <Card style={[styles.errorCard, { backgroundColor: `${theme.error}12`, borderColor: `${theme.error}55` }]}> 
            <AppText variant="bodySmall" style={{ color: theme.error }}>{loadError}</AppText>
          </Card>
        ) : null}

        {renderMapAnchor()}

        <View style={styles.signalList}>
          {SIGNALS.map((signal) => {
            const selected = selectedSignal === signal.type;
            return (
              <Pressable
                key={signal.type}
                onPress={() => {
                  setSelectedSignal(signal.type);
                  setError(null);
                }}
                style={[
                  styles.signalButton,
                  {
                    backgroundColor: selected ? `${theme.primary}18` : theme.card,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
              >
                <Ionicons name={signal.icon} size={20} color={selected ? theme.primary : theme.textSecondary} />
                <AppText variant="body" style={[styles.signalLabel, { color: theme.text }]}> 
                  {signal.label}
                </AppText>
                {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.primary} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.noteBlock}>
          <View style={styles.noteHeader}>
            <AppText variant="label" style={{ color: theme.text }}>Optional note</AppText>
            <AppText variant="bodySmall" style={{ color: theme.textTertiary }}>
              {note.length}/{NOTE_MAX_LENGTH}
            </AppText>
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            maxLength={NOTE_MAX_LENGTH}
            placeholder="Add a short, non-identifying note"
            placeholderTextColor={theme.inputPlaceholder}
            style={[
              styles.noteInput,
              {
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
                color: theme.text,
              },
            ]}
            returnKeyType="done"
          />
        </View>

        {error ? (
          <AppText variant="bodySmall" style={[styles.inlineError, { color: theme.error }]}> 
            {error}
          </AppText>
        ) : null}

        <Button
          title={submitting ? 'Submitting...' : 'Submit response'}
          onPress={handleSubmit}
          disabled={!selectedSignal || Boolean(loadError)}
          loading={submitting}
        />
        <Button
          title="Skip"
          variant="ghost"
          onPress={() => navigation.goBack()}
          disabled={submitting}
          style={styles.skipButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  headerBlock: {
    marginBottom: 20,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 22,
  },
  simulationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  errorCard: {
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  mapShell: {
    height: 190,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 22,
  },
  map: {
    flex: 1,
  },
  mapCaption: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noMapCard: {
    borderWidth: 1,
    marginBottom: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noMapText: {
    flex: 1,
    marginLeft: 10,
  },
  signalList: {
    gap: 10,
    marginBottom: 22,
  },
  signalButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalLabel: {
    flex: 1,
    marginLeft: 12,
  },
  noteBlock: {
    marginBottom: 14,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  inlineError: {
    marginBottom: 12,
  },
  skipButton: {
    marginTop: 8,
  },
});

export default WitnessPromptScreen;
