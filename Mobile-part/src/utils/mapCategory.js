export const getMarkerColor = (category, categoryDisplay, fallbackColor) => {
  return categoryDisplay[category]?.mapColor || fallbackColor;
};

export const getCategoryLabel = (category, categoryDisplay) => {
  return categoryDisplay[category]?.label || categoryDisplay.other?.label || 'Other';
};
