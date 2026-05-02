import { useState } from 'react';

const useIncidentFilters = ({ defaultTimeframe = '30d' } = {}) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(defaultTimeframe);

  return {
    selectedCategory,
    setSelectedCategory,
    selectedTimeframe,
    setSelectedTimeframe,
  };
};

export default useIncidentFilters;