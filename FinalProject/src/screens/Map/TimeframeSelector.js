import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import styles from './mapStyles';

const TIMEFRAME_OPTIONS = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
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
            <Text
              style={[
                styles.timeframeText,
                { color: isActive ? theme.card : theme.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default TimeframeSelector;
