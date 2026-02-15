import React from 'react';
import incidentConstants from '../../../constants/incident';
import colors from '../../../constants/colors';
import Badge from './Badge';

const { STATUS_LABELS } = incidentConstants;
const { STATUS_COLORS_HEX, STATUS_BADGE_COLORS } = colors;
const statusBadgeColors = STATUS_COLORS_HEX || STATUS_BADGE_COLORS;

const StatusBadge = ({ status, style, textStyle }) => {
  const label = STATUS_LABELS[status] || status;
  const badgeColor = statusBadgeColors[status] || statusBadgeColors.default;

  return <Badge label={label} color={badgeColor} style={style} textStyle={textStyle} />;
};

export default StatusBadge;
