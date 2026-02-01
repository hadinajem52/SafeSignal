import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import incidentConstants from '../../../constants/incident';

const { SEVERITY_COLORS, SEVERITY_LEVELS } = incidentConstants;

const SeverityBadge = ({ severity, style, textStyle }) => {
  const label = SEVERITY_LEVELS.find((level) => level.value === severity)?.label || severity;
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;

  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={[styles.text, textStyle]}>{label}</Text>
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
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SeverityBadge;
