import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const AuthHeader = ({
  icon = '🛡️',
  title = 'SafeSignal',
  subtitle,
  titleColor,
  children,
  marginBottom = 32,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[{ alignItems: 'center', marginBottom }]}>
      <Text style={{ fontSize: 56, marginBottom: 10 }}>{icon}</Text>
      <Text style={{ fontSize: 30, fontWeight: 'bold', color: titleColor || theme.primary }}>{title}</Text>
      {subtitle ? <Text style={{ fontSize: 15, marginTop: 5, color: theme.textSecondary }}>{subtitle}</Text> : null}
      {children}
    </View>
  );
};

export default AuthHeader;
