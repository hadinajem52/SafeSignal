import React from 'react';
import { StyleSheet } from 'react-native';
import { createBox, createText } from '@shopify/restyle';

const Box = createBox();
const ThemedText = createText();

const Badge = ({ label, color, style, textStyle }) => {
  return (
    <Box
      paddingHorizontal="sm"
      paddingVertical="xs"
      borderRadius="md"
      style={[styles.badge, { backgroundColor: color }, style]}
    >
      <ThemedText variant="caption" style={[styles.text, textStyle]}>
        {label}
      </ThemedText>
    </Box>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    includeFontPadding: false,
  },
});

export default Badge;
