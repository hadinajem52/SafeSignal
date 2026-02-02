import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const IncidentDateTimePicker = ({
  incidentDate,
  formatDate,
  onSetToNow,
}) => {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>When did this happen?</Text>
      <View style={styles.dateTimeContainer}>
        <View style={styles.dateDisplay}>
          <Text style={styles.dateIcon}>📅</Text>
          <Text style={styles.dateText}>{formatDate(incidentDate)}</Text>
        </View>
        <TouchableOpacity style={styles.setNowButton} onPress={onSetToNow}>
          <Text style={styles.setNowButtonText}>Set to Now</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.helperText}>
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
    color: '#333',
    marginBottom: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
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
    color: '#333',
  },
  setNowButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  setNowButtonText: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default IncidentDateTimePicker;
