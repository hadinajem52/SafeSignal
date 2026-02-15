import React from 'react';
import incidentConstants from '../../../constants/incident';
import Badge from './Badge';

const { SEVERITY_COLORS, SEVERITY_LEVELS } = incidentConstants;

const SeverityBadge = ({ severity, style, textStyle }) => {
  const label = SEVERITY_LEVELS.find((level) => level.value === severity)?.label || severity;
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;

  return <Badge label={label} color={color} style={style} textStyle={textStyle} />;
};

export default SeverityBadge;
