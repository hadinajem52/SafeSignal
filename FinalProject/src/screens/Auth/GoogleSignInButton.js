import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';

const GoogleSignInButton = ({ title, loading, disabled, onPress }) => {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <>
          <View style={[styles.iconWrap, { backgroundColor: theme.googleButtonBg }]}> 
            <Ionicons name="logo-google" size={17} color={theme.googleBlue} />
          </View>
          <AppText variant="button" style={[styles.text, { color: theme.text }]}> 
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  disabled: {
    opacity: 0.58,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  text: {
    includeFontPadding: false,
  },
});

export default GoogleSignInButton;
