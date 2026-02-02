import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const IncidentSeverityPicker = ({
  levels,
  severity,
  onSelect,
}) => {
  const currentLevel = levels.find(l => l.value === severity);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Severity Level</Text>
      <View style={styles.severityContainer}>
        {levels.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.severityButton,
              { borderColor: level.color },
              severity === level.value && { backgroundColor: level.color },
            ]}
            onPress={() => onSelect(level.value)}
          >
            <Text
              style={[
                styles.severityLabel,
                severity === level.value && styles.severityLabelSelected,
              ]}
            >
              {level.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.helperText}>
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
    color: '#333',
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
    backgroundColor: '#fff',
  },
  severityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  severityLabelSelected: {
    color: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default IncidentSeverityPicker;
