import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText } from '../../components';
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
            <Pressable
              key={filter.key}
              style={({ pressed }) => [
                styles.filterButton,
                {
                  backgroundColor: isActive ? theme.primary : theme.surface,
                  borderColor: isActive ? theme.primary : theme.border,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={() => onSelectFilter(filter.key)}
            >
              <AppText
                variant="caption"
                style={[
                  styles.filterButtonText,
                  { color: isActive ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                {filter.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default StatusFilterBar;
