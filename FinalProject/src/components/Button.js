import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { createText, useTheme as useRestyleTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const ThemedText = createText();

const getReadableTextColor = (hexColor) => {
  if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#') || hexColor.length !== 7) {
    return '#FFFFFF';
  }

  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#0F172A' : '#FFFFFF';
};

const Button = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
  icon,
  useGradient = true,
}) => {
  const { theme } = useTheme();
  const restyleTheme = useRestyleTheme();
  const isDisabled = disabled || loading;
  const customBackgroundColor = StyleSheet.flatten(style)?.backgroundColor;
  const primaryTextColor = getReadableTextColor(customBackgroundColor || theme.primary);

  const variantStyles = {
    primary: {
      backgroundColor: theme.primary,
      borderColor: theme.primaryDark || theme.primary,
      textColor: primaryTextColor,
    },
    secondary: {
      backgroundColor: theme.primaryLight || 'transparent',
      borderColor: theme.primary,
      textColor: theme.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: theme.primary,
    },
  };

  const selected = variantStyles[variant] || variantStyles.primary;
  const baseStyle = {
    paddingVertical: restyleTheme?.spacing?.sm || 8,
    paddingHorizontal: restyleTheme?.spacing?.lg || 16,
    borderRadius: restyleTheme?.borderRadii?.lg || 12,
    minHeight: 48,
    borderWidth: variant === 'ghost' ? 0 : 1,
  };

  const content = loading ? (
    <ActivityIndicator color={selected.textColor} />
  ) : (
    <View style={styles.contentRow}>
      {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
      <ThemedText variant="button" style={[styles.baseText, { color: selected.textColor }, textStyle]}>
        {title}
      </ThemedText>
    </View>
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        baseStyle,
        selected,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {variant === 'primary' && useGradient ? (
        <LinearGradient
          colors={[theme.primary, theme.primaryDark || theme.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientFill}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradientFill: {
    width: '100%',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    includeFontPadding: false,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.96,
  },
  disabled: {
    opacity: 0.55,
  },
});

export default Button;
