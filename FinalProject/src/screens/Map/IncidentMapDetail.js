import React from 'react';
import { IncidentDetailModal } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import { getCategoryLabel, getMarkerColor } from '../../utils/mapCategory';

const IncidentMapDetail = ({ selectedIncident, onClose, onCenterMap, categoryDisplay }) => {
  const { theme } = useTheme();

  return (
    <IncidentDetailModal
      visible={!!selectedIncident}
      incident={selectedIncident}
      onClose={onClose}
      onCenterMap={onCenterMap}
      getMarkerColor={(category) => getMarkerColor(category, categoryDisplay, theme.mapMarkerDefault)}
      getCategoryLabel={(category) => getCategoryLabel(category, categoryDisplay)}
      categoryDisplay={categoryDisplay}
    />
  );
};

export default IncidentMapDetail;
