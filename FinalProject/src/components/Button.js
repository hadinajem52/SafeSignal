import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

const Button = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#1a73e8' : '#fff'} />
      ) : (
        <Text style={[styles.baseText, styles[`${variant}Text`], textStyle]}>
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
  primary: {
    backgroundColor: '#1a73e8',
  },
  primaryText: {
    color: '#fff',
  },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1a73e8',
  },
  secondaryText: {
    color: '#1a73e8',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: '#1a73e8',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default Button;
