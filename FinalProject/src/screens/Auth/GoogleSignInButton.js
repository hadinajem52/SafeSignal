import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const GoogleSignInButton = ({ title, loading, disabled, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: theme.googleButtonBg, borderColor: theme.border },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <>
          <Text style={[styles.icon, { color: theme.googleBlue }]}>G</Text>
          <Text style={[styles.text, { color: theme.text }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GoogleSignInButton;
