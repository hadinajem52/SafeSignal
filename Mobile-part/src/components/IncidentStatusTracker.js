import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AppText from './Text';

// Canonical citizen-report lifecycle. Branch / terminal states (rejected,
// needs_info, merged) are folded onto this track below.
const FLOW = [
  { key: 'submitted', label: 'Submitted', desc: 'Report received', icon: 'paper-plane-outline' },
  { key: 'in_review', label: 'In Review', desc: 'Reviewed by moderators', icon: 'search-outline' },
  { key: 'verified', label: 'Verified', desc: 'Confirmed as valid', icon: 'shield-checkmark-outline' },
  { key: 'responding', label: 'Response', desc: 'Authorities responding', icon: 'car-outline' },
  { key: 'resolved', label: 'Resolved', desc: 'Case closed', icon: 'checkmark-done-outline' },
];

const STATUS_INDEX = {
  draft: 0,
  submitted: 0,
  auto_processed: 1,
  auto_flagged: 1,
  in_review: 1,
  needs_info: 1,
  verified: 2,
  published: 2,
  dispatched: 3,
  on_scene: 3,
  investigating: 3,
  police_closed: 4,
  resolved: 4,
  archived: 4,
};

const buildSteps = (status) => {
  if (status === 'rejected') {
    return [
      { ...FLOW[0], state: 'done' },
      { ...FLOW[1], state: 'done' },
      { key: 'rejected', label: 'Rejected', desc: 'Did not meet reporting criteria', icon: 'close-circle-outline', state: 'rejected' },
    ];
  }

  if (status === 'merged') {
    return [
      { ...FLOW[0], state: 'done' },
      { key: 'merged', label: 'Merged', desc: 'Combined with a related report', icon: 'git-merge-outline', state: 'current' },
    ];
  }

  const current = STATUS_INDEX[status] ?? 0;
  return FLOW.map((step, i) => {
    const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
    if (status === 'needs_info' && state === 'current') {
      return { ...step, state, desc: 'More information requested from you' };
    }
    return { ...step, state };
  });
};

const IncidentStatusTracker = ({ status }) => {
  const { theme } = useTheme();
  const steps = buildSteps(status);

  const nodeColor = (state, isLast) => {
    switch (state) {
      case 'done':
        return theme.success;
      case 'current':
        return isLast ? theme.success : theme.primary;
      case 'rejected':
        return theme.error;
      default:
        return theme.textTertiary;
    }
  };

  return (
    <View>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const filled = step.state !== 'upcoming';
        const color = nodeColor(step.state, isLast);
        const iconName =
          step.state === 'done' ? 'checkmark' : step.state === 'rejected' ? 'close' : step.icon;

        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.railCol}>
              <View
                style={[
                  styles.node,
                  filled
                    ? { backgroundColor: color, borderColor: color }
                    : { backgroundColor: theme.card, borderColor: theme.border },
                  step.state === 'current' && {
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 6,
                    elevation: 4,
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={step.state === 'done' || step.state === 'rejected' ? 15 : 14}
                  color={filled ? '#FFFFFF' : theme.textTertiary}
                />
              </View>
              {!isLast ? (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: step.state === 'done' ? theme.success : theme.border },
                  ]}
                />
              ) : null}
            </View>

            <View style={[styles.textCol, isLast && styles.textColLast]}>
              <AppText
                variant="label"
                style={{ color: step.state === 'upcoming' ? theme.textTertiary : theme.text }}
              >
                {step.label}
              </AppText>
              <AppText variant="small" style={{ color: theme.textTertiary, marginTop: 2 }}>
                {step.desc}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  railCol: {
    width: 30,
    alignItems: 'center',
  },
  node: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 16,
    marginVertical: 3,
    borderRadius: 1,
  },
  textCol: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 20,
    paddingTop: 4,
  },
  textColLast: {
    paddingBottom: 0,
  },
});

export default IncidentStatusTracker;
