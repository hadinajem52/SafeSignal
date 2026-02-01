import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CategoryFilter = ({
  categoryDisplay,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScrollContent}
    >
      <TouchableOpacity
        style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
        onPress={() => onSelectCategory(null)}
      >
        <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>
          All
        </Text>
      </TouchableOpacity>

      {Object.entries(categoryDisplay).map(([key, config]) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.filterChip,
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
    backgroundColor: '#f5f5f5',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  filterChipIcon: {
    marginRight: 4,
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
});

export default CategoryFilter;
