import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const IncidentCategoryPicker = ({
  categories,
  selectedCategory,
  onSelect,
  error,
}) => {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        Category <Text style={styles.required}>*</Text>
      </Text>
      <View style={styles.categoryGrid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.value}
            style={[
              styles.categoryButton,
              selectedCategory === category.value && styles.categoryButtonSelected,
            ]}
            onPress={() => onSelect(category.value)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === category.value && styles.categoryLabelSelected,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  categoryButton: {
    width: '31%',
    margin: '1%',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  categoryButtonSelected: {
    borderColor: '#1a73e8',
    backgroundColor: '#e8f4fd',
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryLabelSelected: {
    color: '#1a73e8',
    fontWeight: '700',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
});

export default IncidentCategoryPicker;
