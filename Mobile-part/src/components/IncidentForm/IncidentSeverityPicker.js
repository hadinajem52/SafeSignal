import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../../components';
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
      <AppText variant="label" style={[styles.label, { color: theme.text }]}>Severity Level</AppText>
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
            <AppText
              variant="bodySmall"
              style={[
                styles.severityLabel,
                { color: theme.text },
                severity === level.value && styles.severityLabelSelected,
              ]}
            >
              {level.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
      <AppText variant="small" style={[styles.helperText, { color: theme.textSecondary }]}> 
        {currentLevel?.description}
      </AppText>
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
  },
  severityLabelSelected: {
    color: '#fff',
  },
  helperText: {
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default React.memo(IncidentSeverityPicker);
