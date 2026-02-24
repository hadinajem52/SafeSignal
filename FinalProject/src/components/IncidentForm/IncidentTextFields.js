import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { AppText } from '../../components';
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
        <AppText variant="label" style={[styles.label, { color: theme.text }]}>Title *</AppText>
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
        {errors.title && <AppText variant="small" style={[styles.errorText, { color: theme.error }]}>{errors.title}</AppText>}
        <AppText variant="small" style={[styles.charCount, { color: theme.textSecondary }]}>{title.length}/255</AppText>
      </View>

      {/* Description Input */}
      <View style={styles.inputGroup}>
        <AppText variant="label" style={[styles.label, { color: theme.text }]}>Description *</AppText>
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
        {errors.description && <AppText variant="small" style={[styles.errorText, { color: theme.error }]}>{errors.description}</AppText>}
        <AppText variant="small" style={[styles.charCount, { color: theme.textSecondary }]}>{description.length}/5000</AppText>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
  },
  inputError: {
  },
  errorText: {
    marginTop: 4,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 4,
  },
});

export default React.memo(IncidentTextFields);
