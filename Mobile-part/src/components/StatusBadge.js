import React from 'react';
import incidentConstants from '../../../constants/incident';
import Badge from './Badge';
import { useTheme } from '../context/ThemeContext';

const { STATUS_LABELS } = incidentConstants;

const getStatusColor = (status, theme) => {
  switch (status) {
    case 'submitted':
      return theme.warning;
    case 'auto_processed':
      return theme.info;
    case 'in_review':
      return theme.info;
    case 'verified':
      return theme.success;
    case 'dispatched':
      return theme.accentBlue;
    case 'on_scene':
      return theme.accentTeal;
    case 'investigating':
      return theme.accentPurple;
    case 'police_closed':
      return theme.success;
    case 'rejected':
      return theme.error;
    case 'needs_info':
      return theme.accentOrange;
    case 'published':
      return theme.primary;
    case 'resolved':
      return theme.safetyGood;
    case 'archived':
      return theme.textTertiary;
    case 'auto_flagged':
      return theme.error;
    case 'merged':
      return theme.accentBlue;
    case 'draft':
      return theme.textTertiary;
    default:
      return theme.textSecondary;
  }
};

const StatusBadge = ({ status, style, textStyle }) => {
  const { theme } = useTheme();
  const label = STATUS_LABELS[status] || status;
  const badgeColor = getStatusColor(status, theme);

  return (
    <Badge
      label={label}
      color={badgeColor}
      style={style}
      textStyle={[{ color: badgeColor }, textStyle]}
    />
  );
};

export default StatusBadge;
