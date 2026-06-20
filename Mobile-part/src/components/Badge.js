import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBox, createText } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
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

const Badge = ({ label, color, icon, style, textStyle }) => {
  const { theme } = useTheme();
  const tint = color || theme.text;

  return (
    <Box
      borderRadius="pill"
      style={[
        styles.badge,
        icon
          ? { backgroundColor: hexToRgba(tint, 0.14), paddingLeft: 8 }
          : {
              backgroundColor: hexToRgba(tint, 0.16),
              borderColor: hexToRgba(tint, 0.34),
              borderWidth: 1,
              paddingLeft: 12,
            },
        style,
      ]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: hexToRgba(tint, 0.22) }]}>
          <Ionicons name={icon} size={12} color={tint} />
        </View>
      ) : null}
      <ThemedText variant="caption" style={[styles.text, { color: tint }, textStyle]}>
        {label}
      </ThemedText>
    </Box>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingRight: 12,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  text: {
    includeFontPadding: false,
    textTransform: 'capitalize',
  },
});

export default Badge;
