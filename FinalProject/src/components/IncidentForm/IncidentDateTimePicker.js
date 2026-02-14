import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const IncidentDateTimePicker = ({
  incidentDate,
  formatDate,
  onSetToNow,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.text }]}>When did this happen?</Text>
      <View style={[styles.dateTimeContainer, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
        <View style={styles.dateDisplay}>
          <Text style={styles.dateIcon}>📅</Text>
          <Text style={[styles.dateText, { color: theme.text }]}>{formatDate(incidentDate)}</Text>
        </View>
        <TouchableOpacity style={[styles.setNowButton, { backgroundColor: theme.surface }]} onPress={onSetToNow}>
          <Text style={[styles.setNowButtonText, { color: theme.primary }]}>Set to Now</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.helperText, { color: theme.textSecondary }]}>
        Default is current time. Adjust if incident happened earlier.
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
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
  },
  setNowButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  setNowButtonText: {
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default IncidentDateTimePicker;
