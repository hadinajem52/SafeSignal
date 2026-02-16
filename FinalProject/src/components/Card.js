import React from 'react';
import { createBox, useTheme as useRestyleTheme } from '@shopify/restyle';
import { shadows } from '../../../constants/spacing';
import { useTheme } from '../context/ThemeContext';

const Box = createBox();

const Card = ({ children, style }) => {
  const { theme } = useTheme();
  const restyleTheme = useRestyleTheme();

  return (
    <Box
      backgroundColor="card"
      borderColor="border"
      borderRadius="lg"
      padding="lg"
      borderWidth={1}
      style={[
        {
          ...shadows.card,
          shadowColor: theme.shadow,
          borderRadius: restyleTheme?.borderRadii?.lg || 14,
        },
        style,
      ]}
    >
      {children}
    </Box>
  );
};

export default Card;
