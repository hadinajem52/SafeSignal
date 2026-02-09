import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const IncidentSeverityPicker = ({
  levels,
  severity,
  onSelect,
}) => {
  const { theme } = useTheme();
  const currentLevel = levels.find(l => l.value === severity);

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.text }]}>Severity Level</Text>
      <View style={styles.severityContainer}>
        {levels.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.severityButton,
              { borderColor: level.color },
              { backgroundColor: theme.card },
              severity === level.value && { backgroundColor: level.color },
            ]}
            onPress={() => onSelect(level.value)}
          >
            <Text
              style={[
                styles.severityLabel,
                { color: theme.text },
                severity === level.value && styles.severityLabelSelected,
              ]}
            >
              {level.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.helperText, { color: theme.textSecondary }]}>
        {currentLevel?.description}
      </Text>
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
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  severityLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  severityLabelSelected: {
    color: '#fff',
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default IncidentSeverityPicker;
