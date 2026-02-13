import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const AuthDivider = ({ label = 'or' }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.divider, { borderColor: theme.border }]} />
      <Text style={[styles.text, { color: theme.textTertiary }]}>{label}</Text>
      <View style={[styles.divider, { borderColor: theme.border }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
  },
  text: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
});

export default AuthDivider;
