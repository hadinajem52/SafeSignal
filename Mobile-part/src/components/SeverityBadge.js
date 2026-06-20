import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBox, createText } from '@shopify/restyle';
import incidentConstants from '../../../constants/incident';
import { useTheme } from '../context/ThemeContext';

const { SEVERITY_LEVELS } = incidentConstants;

const Box = createBox();
const ThemedText = createText();

const SEVERITY_PIP_COUNT = { low: 1, medium: 2, high: 3, critical: 4 };
const BAR_HEIGHTS = [7, 10, 13, 16];

const getSeverityColor = (severity, theme) => {
  switch (severity) {
    case 'low':
      return theme.severityLow;
    case 'medium':
      return theme.severityMedium;
    case 'high':
      return theme.severityHigh;
    case 'critical':
      return theme.severityCritical;
    default:
      return theme.severityMedium;
  }
};

const SeverityBadge = ({ severity, style, textStyle }) => {
  const { theme } = useTheme();
  const label = SEVERITY_LEVELS.find((level) => level.value === severity)?.label || severity;
  const color = getSeverityColor(severity, theme);
  const filledPips = SEVERITY_PIP_COUNT[severity] || 2;

  return (
    <Box borderRadius="pill" style={[styles.meter, { backgroundColor: theme.surface2 }, style]}>
      <View style={styles.bars}>
        {BAR_HEIGHTS.map((height, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              index === BAR_HEIGHTS.length - 1 && styles.barLast,
              { height, backgroundColor: index < filledPips ? color : theme.border },
            ]}
          />
        ))}
      </View>
      <ThemedText variant="caption" style={[styles.label, { color }, textStyle]}>
        {label}
      </ThemedText>
    </Box>
  );
};

const styles = StyleSheet.create({
  meter: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 12,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 16,
    marginRight: 8,
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
    marginRight: 2,
  },
  barLast: {
    marginRight: 0,
  },
  label: {
    includeFontPadding: false,
    textTransform: 'capitalize',
  },
});

export default SeverityBadge;
