import React from 'react';
import { TextInput, View } from 'react-native';
import { AppText, Button, Modal as AppModal } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const EditNameModal = ({ visible, pendingName, onChangeName, onCancel, onSave }) => {
  const { theme } = useTheme();

  return (
    <AppModal visible={visible} onClose={onCancel} contentStyle={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
      <AppText variant="h4" style={[styles.modalTitle, { color: theme.text }]}>Edit Display Name</AppText>
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
    </AppModal>
  );
};

export default EditNameModal;
