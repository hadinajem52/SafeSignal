import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const IncidentCategoryPicker = ({
  categories,
  selectedCategory,
  onSelect,
  error,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.text }]}>
        Category <Text style={[styles.required, { color: theme.error }]}>*</Text>
      </Text>
      <View style={styles.categoryGrid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.value}
            style={[
              styles.categoryButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
              selectedCategory === category.value && [
                styles.categoryButtonSelected,
                {
                  borderColor: theme.primary,
                  backgroundColor: `${theme.primary}20`,
                },
              ],
            ]}
            onPress={() => onSelect(category.value)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryLabel,
                { color: theme.text },
                selectedCategory === category.value && [
                  styles.categoryLabelSelected,
                  { color: theme.primary },
                ],
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
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
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  categoryButtonSelected: {
    borderColor: '#1a73e8',
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 12,
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
