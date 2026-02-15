import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { createText, useTheme as useRestyleTheme } from '@shopify/restyle';

const ThemedText = createText();

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
  const restyleTheme = useRestyleTheme();
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: {
      backgroundColor: theme.primary,
      textColor: '#fff',
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.primary,
      textColor: theme.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      textColor: theme.primary,
    },
  };

  const selected = variantStyles[variant] || variantStyles.primary;
  const baseStyle = {
    paddingVertical: restyleTheme?.spacing?.md || 12,
    paddingHorizontal: restyleTheme?.spacing?.lg || 16,
    borderRadius: restyleTheme?.borderRadii?.md || 8,
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        baseStyle,
        selected,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={selected.textColor} />
      ) : (
        <ThemedText
          variant="button"
          style={[styles.baseText, { color: selected.textColor }, textStyle]}
        >
          {title}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    includeFontPadding: false,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default Button;
