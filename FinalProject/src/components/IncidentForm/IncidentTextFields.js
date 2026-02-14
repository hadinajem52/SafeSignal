import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const IncidentTextFields = ({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  errors,
}) => {
  const { theme } = useTheme();

  return (
    <>
      {/* Title Input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>
          Title <Text style={[styles.required, { color: theme.error }]}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.input,
              borderColor: theme.inputBorder,
              color: theme.text,
            },
            errors.title && [styles.inputError, { borderColor: theme.error }],
          ]}
          placeholder="Brief summary of the incident"
          placeholderTextColor={theme.inputPlaceholder}
          value={title}
          onChangeText={onTitleChange}
          maxLength={255}
        />
        {errors.title && <Text style={[styles.errorText, { color: theme.error }]}>{errors.title}</Text>}
        <Text style={[styles.charCount, { color: theme.textSecondary }]}>{title.length}/255</Text>
      </View>

      {/* Description Input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>
          Description <Text style={[styles.required, { color: theme.error }]}>*</Text>
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: theme.input,
              borderColor: theme.inputBorder,
              color: theme.text,
            },
            errors.description && [styles.inputError, { borderColor: theme.error }],
          ]}
          placeholder="Provide detailed information about what happened, when, and any other relevant details..."
          placeholderTextColor={theme.inputPlaceholder}
          value={description}
          onChangeText={onDescriptionChange}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={5000}
        />
        {errors.description && <Text style={[styles.errorText, { color: theme.error }]}>{errors.description}</Text>}
        <Text style={[styles.charCount, { color: theme.textSecondary }]}>{description.length}/5000</Text>
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
    marginBottom: 8,
  },
  required: {
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  inputError: {
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
});

export default IncidentTextFields;
