import React from 'react';
import { Modal, Text, TextInput, View } from 'react-native';
import { Button } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const EditNameModal = ({ visible, pendingName, onChangeName, onCancel, onSave }) => {
  const { theme } = useTheme();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}> 
        <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Display Name</Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: theme.input,
                borderColor: theme.inputBorder,
                color: theme.text,
              },
            ]}
            value={pendingName}
            onChangeText={onChangeName}
            placeholder="Enter display name"
            placeholderTextColor={theme.inputPlaceholder}
          />
          <View style={styles.modalActions}>
            <Button title="Cancel" onPress={onCancel} variant="secondary" style={styles.modalButton} />
            <Button title="Save" onPress={onSave} style={styles.modalButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditNameModal;
