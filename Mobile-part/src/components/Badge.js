import React from 'react';
import { StyleSheet } from 'react-native';
import { createBox, createText } from '@shopify/restyle';
import { useTheme } from '../context/ThemeContext';

const Box = createBox();
const ThemedText = createText();

const hexToRgba = (hexColor, alpha) => {
  if (!hexColor || typeof hexColor !== 'string') {
    return `rgba(15, 23, 42, ${alpha})`;
  }
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) {
    return `rgba(15, 23, 42, ${alpha})`;
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(15, 23, 42, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const Badge = ({ label, color, style, textStyle }) => {
  const { theme } = useTheme();
  const tintBackground = hexToRgba(color, 0.16);
  const tintBorder = hexToRgba(color, 0.34);
  const textColor = color || theme.text;

  return (
    <Box
      paddingHorizontal="md"
      paddingVertical="xs"
      borderRadius="pill"
      style={[
        styles.badge,
        {
          backgroundColor: tintBackground,
          borderColor: tintBorder,
        },
        style,
      ]}
    >
      <ThemedText variant="caption" style={[styles.text, { color: textColor }, textStyle]}>
        {label}
      </ThemedText>
    </Box>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: {
    includeFontPadding: false,
    textTransform: 'capitalize',
  },
});

export default Badge;
