import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const CategoryFilter = ({
  categoryDisplay,
  selectedCategory,
  onSelectCategory,
}) => {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScrollContent}
    >
      <TouchableOpacity
        style={[
          styles.filterChip,
          { backgroundColor: theme.surface, borderColor: theme.border },
          !selectedCategory && [styles.filterChipActive, { backgroundColor: theme.mapMarkerDefault, borderColor: theme.mapMarkerDefault }],
        ]}
        onPress={() => onSelectCategory(null)}
      >
        <Text style={[styles.filterChipText, { color: theme.textSecondary }, !selectedCategory && styles.filterChipTextActive]}>
          All
        </Text>
      </TouchableOpacity>

      {Object.entries(categoryDisplay).map(([key, config]) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.filterChip,
            { backgroundColor: theme.surface, borderColor: theme.border },
            selectedCategory === key && styles.filterChipActive,
            selectedCategory === key && { backgroundColor: config.mapColor },
          ]}
          onPress={() => onSelectCategory(selectedCategory === key ? null : key)}
        >
          <Ionicons
            name={config.mapIcon}
            size={14}
            color={selectedCategory === key ? '#fff' : config.mapColor}
            style={styles.filterChipIcon}
          />
          <Text
            style={[
              styles.filterChipText,
              { color: theme.textSecondary },
              selectedCategory === key && styles.filterChipTextActive,
            ]}
          >
            {config.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  filterScrollContent: {
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  filterChipActive: {
    borderColor: 'transparent',
  },
  filterChipIcon: {
    marginRight: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
});

export default CategoryFilter;
