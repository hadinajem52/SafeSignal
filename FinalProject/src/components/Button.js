import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const Button = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: {
      backgroundColor: theme.primary,
      text: '#fff',
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.primary,
      text: theme.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      text: theme.primary,
    },
  };

  const selected = variantStyles[variant];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        selected,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={selected.text} />
      ) : (
        <Text style={[styles.baseText, { color: selected.text }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default Button;
