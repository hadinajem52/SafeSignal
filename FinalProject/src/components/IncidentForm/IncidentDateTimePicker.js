import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';

const IncidentDateTimePicker = ({
  incidentDate,
  formatDate,
  onSetToNow,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.inputGroup}>
      <AppText variant="label" style={[styles.label, { color: theme.text }]}>When did this happen?</AppText>
      <View style={[styles.dateTimeContainer, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}> 
        <View style={styles.dateDisplay}>
          <Ionicons name="calendar-outline" size={16} color={theme.primary} style={styles.dateIcon} />
          <AppText variant="body" style={[styles.dateText, { color: theme.text }]}>{formatDate(incidentDate)}</AppText>
        </View>
        <TouchableOpacity style={[styles.setNowButton, { backgroundColor: theme.surface }]} onPress={onSetToNow}>
          <AppText variant="buttonSmall" style={[styles.setNowButtonText, { color: theme.primary }]}>Set to Now</AppText>
        </TouchableOpacity>
      </View>
      <AppText variant="small" style={[styles.helperText, { color: theme.textSecondary }]}> 
        Default is current time. Adjust if incident happened earlier.
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
  },
  setNowButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  setNowButtonText: {
  },
  helperText: {
    marginTop: 6,
    fontStyle: 'italic',
  },
});

export default IncidentDateTimePicker;
