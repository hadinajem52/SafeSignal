import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './Text';
import PressableScale from './PressableScale';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { incidentAPI } from '../services/api';
import haptics from '../utils/haptics';

export default function IncidentCorroboration({ incidentId }) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!incidentId) return undefined;
    let active = true;
    incidentAPI.getCorroboration(incidentId).then((res) => {
      if (active && res.success) {
        setState({ count: res.count, hasCorroborated: res.hasCorroborated });
      }
    });
    return () => {
      active = false;
    };
  }, [incidentId]);

  if (!state) {
    return null;
  }

  const active = state.hasCorroborated;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const previous = state;
    const next = !active;
    setState({ count: state.count + (next ? 1 : -1), hasCorroborated: next });
    haptics.selection();
    const res = await incidentAPI.setCorroboration(incidentId, next);
    setBusy(false);
    if (!res.success) {
      setState(previous);
      showToast(res.error || 'Could not update corroboration.', 'error');
      return;
    }
    setState({ count: res.count, hasCorroborated: res.hasCorroborated });
  };

  return (
    <View style={styles.wrap}>
      <PressableScale
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={active ? 'Remove your corroboration' : 'I saw this too'}
        style={[
          styles.pill,
          { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? `${theme.primary}1A` : theme.card },
        ]}
      >
        <Ionicons name={active ? 'eye' : 'eye-outline'} size={16} color={active ? theme.primary : theme.textSecondary} />
        <AppText variant="label" style={{ color: active ? theme.primary : theme.text }}>
          {active ? 'You saw this too' : 'I saw this too'}
        </AppText>
        {state.count > 0 ? (
          <View style={[styles.countBadge, { backgroundColor: active ? theme.primary : theme.surface2 }]}>
            <AppText variant="caption" style={{ color: active ? '#FFFFFF' : theme.textSecondary }}>
              {state.count}
            </AppText>
          </View>
        ) : null}
      </PressableScale>
      <AppText variant="caption" style={[styles.hint, { color: theme.textTertiary }]}>
        Tapping helps the community confirm reports.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  countBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: 6,
  },
});
