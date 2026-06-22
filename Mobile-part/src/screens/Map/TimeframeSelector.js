import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './mapStyles';

const TIMEFRAME_OPTIONS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

const ALL_OPTION = { value: 'all', label: 'All' };

const TimeframeSelector = ({ selectedTimeframe, onSelectTimeframe, includeAll = false }) => {
  const { theme } = useTheme();
  const options = includeAll ? [...TIMEFRAME_OPTIONS, ALL_OPTION] : TIMEFRAME_OPTIONS;

  return (
    <View style={[styles.timeframeContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {options.map((option) => {
        const isActive = selectedTimeframe === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.timeframeButton, isActive && { backgroundColor: theme.primary }]}
            onPress={() => onSelectTimeframe(option.value)}
            activeOpacity={0.85}
          >
            <AppText
              variant="caption"
              style={[
                styles.timeframeText,
                { color: isActive ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {option.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default React.memo(TimeframeSelector);
