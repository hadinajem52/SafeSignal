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

const TimeframeSelector = ({ selectedTimeframe, onSelectTimeframe }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.timeframeContainer}>
      {TIMEFRAME_OPTIONS.map((option) => {
        const isActive = selectedTimeframe === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.timeframeButton,
              { backgroundColor: isActive ? theme.mapMarkerDefault : theme.neutralGray100 },
            ]}
            onPress={() => onSelectTimeframe(option.value)}
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

export default TimeframeSelector;
