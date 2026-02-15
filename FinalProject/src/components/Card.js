import React from 'react';
import { StyleSheet } from 'react-native';
import { createBox } from '@shopify/restyle';
import { useTheme } from '../context/ThemeContext';

const Box = createBox();

const Card = ({ children, style }) => {
  const { theme } = useTheme();
  return (
    <Box
      backgroundColor="card"
      borderColor="border"
      borderRadius="lg"
      padding="lg"
      borderWidth={1}
      style={[
        styles.card,
        {
          shadowColor: theme.shadow,
        },
        style,
      ]}
    >
      {children}
    </Box>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
});

export default Card;
