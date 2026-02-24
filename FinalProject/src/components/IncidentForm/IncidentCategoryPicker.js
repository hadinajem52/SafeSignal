import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';

const CATEGORY_ICONS = {
  theft: 'cash-outline',
  assault: 'warning-outline',
  vandalism: 'construct-outline',
  suspicious_activity: 'eye-outline',
  traffic_incident: 'car-outline',
  noise_complaint: 'volume-high-outline',
  fire: 'flame-outline',
  medical_emergency: 'medkit-outline',
  hazard: 'alert-circle-outline',
  other: 'help-circle-outline',
};

const IncidentCategoryPicker = ({
  categories,
  selectedCategory,
  onSelect,
  error,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.inputGroup}>
      <AppText variant="label" style={[styles.label, { color: theme.text }]}>Category *</AppText>
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
            <Ionicons
              name={CATEGORY_ICONS[category.value] || 'help-circle-outline'}
              size={18}
              color={selectedCategory === category.value ? theme.primary : theme.textSecondary}
              style={styles.categoryIcon}
            />
            <AppText
              variant="caption"
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
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
      {error && <AppText variant="small" style={[styles.errorText, { color: theme.error }]}>{error}</AppText>}
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
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
    minHeight: 84,
  },
  categoryButtonSelected: {
  },
  categoryIcon: {
    marginBottom: 6,
  },
  categoryLabel: {
    textAlign: 'center',
  },
  categoryLabelSelected: {
  },
  errorText: {
    marginTop: 4,
  },
});

export default React.memo(IncidentCategoryPicker);
