import React from 'react';
import incidentConstants from '../../../constants/incident';
import Badge from './Badge';
import { useTheme } from '../context/ThemeContext';

const { SEVERITY_LEVELS } = incidentConstants;

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

  return <Badge label={label} color={color} style={style} textStyle={[{ color }, textStyle]} />;
};

export default SeverityBadge;
