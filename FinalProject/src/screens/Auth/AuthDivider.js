import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';

const AuthDivider = ({ label = 'or sign in with email' }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.divider, { borderColor: theme.border }]} />
      <AppText variant="small" style={[styles.text, { color: theme.textTertiary }]}>{label}</AppText>
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
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});

export default AuthDivider;
