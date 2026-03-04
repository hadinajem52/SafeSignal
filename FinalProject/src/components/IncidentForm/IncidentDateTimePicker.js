import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Modal } from '../../components';
import { useTheme } from '../../context/ThemeContext';

const pad2 = (n) => String(n).padStart(2, '0');

const IncidentDateTimePicker = ({
  incidentDate,
  formatDate,
  onSetToNow,
  onDateChange,
}) => {
  const { theme } = useTheme();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMonth, setEditMonth] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editHour, setEditHour] = useState('');
  const [editMinute, setEditMinute] = useState('');
  const [editAmPm, setEditAmPm] = useState('AM');
  const [editError, setEditError] = useState('');

  const openEditModal = useCallback(() => {
    const d = incidentDate instanceof Date ? incidentDate : new Date();
    const h = d.getHours();
    setEditMonth(pad2(d.getMonth() + 1));
    setEditDay(pad2(d.getDate()));
    setEditYear(String(d.getFullYear()));
    setEditHour(pad2(h % 12 || 12));
    setEditMinute(pad2(d.getMinutes()));
    setEditAmPm(h >= 12 ? 'PM' : 'AM');
    setEditError('');
    setShowEditModal(true);
  }, [incidentDate]);

  const handleApply = useCallback(() => {
    const month = parseInt(editMonth, 10);
    const day = parseInt(editDay, 10);
    const year = parseInt(editYear, 10);
    let hour = parseInt(editHour, 10);
    const minute = parseInt(editMinute, 10);

    if (isNaN(month) || month < 1 || month > 12) {
      setEditError('Month must be 1–12');
      return;
    }
    if (isNaN(day) || day < 1 || day > 31) {
      setEditError('Day must be 1–31');
      return;
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      setEditError('Enter a valid year (2000–2100)');
      return;
    }
    if (isNaN(hour) || hour < 1 || hour > 12) {
      setEditError('Hour must be 1–12');
      return;
    }
    if (isNaN(minute) || minute < 0 || minute > 59) {
      setEditError('Minute must be 0–59');
      return;
    }

    if (editAmPm === 'PM' && hour !== 12) hour += 12;
    if (editAmPm === 'AM' && hour === 12) hour = 0;

    const newDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (isNaN(newDate.getTime())) {
      setEditError('Invalid date. Please check the values.');
      return;
    }

    if (onDateChange) {
      onDateChange(newDate);
    }
    setShowEditModal(false);
  }, [editMonth, editDay, editYear, editHour, editMinute, editAmPm, onDateChange]);

  return (
    <View style={styles.inputGroup}>
      <AppText variant="label" style={[styles.label, { color: theme.text }]}>When did this happen?</AppText>
      <View style={[styles.dateTimeContainer, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
        <TouchableOpacity style={styles.dateDisplay} onPress={openEditModal} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={16} color={theme.primary} style={styles.dateIcon} />
          <AppText variant="body" style={[styles.dateText, { color: theme.text }]}>{formatDate(incidentDate)}</AppText>
          <Ionicons name="pencil-outline" size={13} color={theme.textSecondary} style={styles.editIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.setNowButton, { backgroundColor: theme.surface }]} onPress={onSetToNow}>
          <AppText variant="buttonSmall" style={[styles.setNowButtonText, { color: theme.primary }]}>Set to Now</AppText>
        </TouchableOpacity>
      </View>
      <AppText variant="small" style={[styles.helperText, { color: theme.textSecondary }]}>
        Tap the date to edit manually, or use "Set to Now".
      </AppText>

      {/* Manual date/time edit modal */}
      <Modal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        contentStyle={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <AppText variant="h4" style={[styles.modalTitle, { color: theme.text }]}>Set Date &amp; Time</AppText>

        {/* Date row */}
        <AppText variant="label" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Date (MM / DD / YYYY)</AppText>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.fieldShort, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
            value={editMonth}
            onChangeText={setEditMonth}
            placeholder="MM"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            maxLength={2}
          />
          <AppText style={[styles.dateSep, { color: theme.textSecondary }]}>/</AppText>
          <TextInput
            style={[styles.fieldShort, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
            value={editDay}
            onChangeText={setEditDay}
            placeholder="DD"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            maxLength={2}
          />
          <AppText style={[styles.dateSep, { color: theme.textSecondary }]}>/</AppText>
          <TextInput
            style={[styles.fieldYear, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
            value={editYear}
            onChangeText={setEditYear}
            placeholder="YYYY"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            maxLength={4}
          />
        </View>

        {/* Time row */}
        <AppText variant="label" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Time (HH : MM)</AppText>
        <View style={styles.timeRow}>
          <TextInput
            style={[styles.fieldShort, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
            value={editHour}
            onChangeText={setEditHour}
            placeholder="HH"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            maxLength={2}
          />
          <AppText style={[styles.dateSep, { color: theme.textSecondary }]}>:</AppText>
          <TextInput
            style={[styles.fieldShort, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
            value={editMinute}
            onChangeText={setEditMinute}
            placeholder="MM"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            maxLength={2}
          />
          <View style={styles.ampmRow}>
            <TouchableOpacity
              style={[styles.ampmBtn, editAmPm === 'AM' && { backgroundColor: theme.primary }]}
              onPress={() => setEditAmPm('AM')}
            >
              <AppText variant="buttonSmall" style={{ color: editAmPm === 'AM' ? '#fff' : theme.textSecondary }}>AM</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ampmBtn, editAmPm === 'PM' && { backgroundColor: theme.primary }]}
              onPress={() => setEditAmPm('PM')}
            >
              <AppText variant="buttonSmall" style={{ color: editAmPm === 'PM' ? '#fff' : theme.textSecondary }}>PM</AppText>
            </TouchableOpacity>
          </View>
        </View>

        {!!editError && (
          <AppText variant="small" style={[styles.errorText, { color: theme.error || '#ef4444' }]}>{editError}</AppText>
        )}

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalCancelBtn, { borderColor: theme.border }]}
            onPress={() => setShowEditModal(false)}
          >
            <AppText variant="label" style={{ color: theme.textSecondary }}>Cancel</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalApplyBtn, { backgroundColor: theme.primary }]}
            onPress={handleApply}
          >
            <AppText variant="label" style={{ color: '#fff' }}>Apply</AppText>
          </TouchableOpacity>
        </View>
      </Modal>
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
    flex: 1,
  },
  dateIcon: {
    marginRight: 8,
  },
  editIcon: {
    marginLeft: 6,
  },
  dateText: {},
  setNowButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  setNowButtonText: {},
  helperText: {
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Modal styles
  modalContent: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    width: '90%',
    alignSelf: 'center',
  },
  modalTitle: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 6,
    marginTop: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldShort: {
    width: 48,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 15,
  },
  fieldYear: {
    width: 68,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 15,
  },
  dateSep: {
    marginHorizontal: 6,
    fontSize: 18,
    fontWeight: '600',
  },
  ampmRow: {
    flexDirection: 'row',
    marginLeft: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  ampmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
  },
  errorText: {
    marginTop: 6,
    marginBottom: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
  modalCancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalApplyBtn: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
});

export default React.memo(IncidentDateTimePicker);
