import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import styles from './myReportsStyles';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'in_review', label: 'In Review' },
  { key: 'verified', label: 'Verified' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'on_scene', label: 'On Scene' },
  { key: 'investigating', label: 'Investigating' },
  { key: 'police_closed', label: 'Police Closed' },
  { key: 'published', label: 'Published' },
];

const StatusFilterBar = ({ selectedFilter, onSelectFilter }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.filterContainer,
        { backgroundColor: theme.card, borderBottomColor: theme.border },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {FILTERS.map((filter) => {
          const isActive = selectedFilter === filter.key;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                { backgroundColor: isActive ? theme.primary : theme.surface },
              ]}
              onPress={() => onSelectFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: isActive ? theme.card : theme.text },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default StatusFilterBar;
