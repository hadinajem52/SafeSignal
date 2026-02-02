import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

const IncidentTextFields = ({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  errors,
}) => {
  return (
    <>
      {/* Title Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Title <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          placeholder="Brief summary of the incident"
          value={title}
          onChangeText={onTitleChange}
          maxLength={255}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        <Text style={styles.charCount}>{title.length}/255</Text>
      </View>

      {/* Description Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Description <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.textArea, errors.description && styles.inputError]}
          placeholder="Provide detailed information about what happened, when, and any other relevant details..."
          value={description}
          onChangeText={onDescriptionChange}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={5000}
        />
        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        <Text style={styles.charCount}>{description.length}/5000</Text>
      </View>
    </>
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
  required: {
    color: '#dc3545',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
});

export default IncidentTextFields;
