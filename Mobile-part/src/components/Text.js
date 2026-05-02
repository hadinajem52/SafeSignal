import React from 'react';
import { createText } from '@shopify/restyle';

const RestyleText = createText();

const AppText = ({ variant = 'body', color = 'text', style, children, ...props }) => {
  return (
    <RestyleText variant={variant} color={color} style={style} {...props}>
      {children}
    </RestyleText>
  );
};

export default AppText;
