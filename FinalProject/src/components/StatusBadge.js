import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import incidentConstants from '../../../constants/incident';
import colors from '../../../constants/colors';

const { STATUS_LABELS } = incidentConstants;
const { STATUS_BADGE_COLORS } = colors;

const StatusBadge = ({ status, style, textStyle }) => {
  const { theme } = useTheme();
  const label = STATUS_LABELS[status] || status;
  const badgeColor = STATUS_BADGE_COLORS[status] || STATUS_BADGE_COLORS.default;

  return (
    <View style={[styles.badge, { backgroundColor: badgeColor }, style]}>
      <Text style={[styles.text, { color: '#fff' }, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusBadge;
