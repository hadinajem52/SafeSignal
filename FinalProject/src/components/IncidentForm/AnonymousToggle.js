import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const AnonymousToggle = ({ isAnonymous, onToggle }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.toggleSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.toggleInfo}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>🕵️ Report Anonymously</Text>
        <Text style={[styles.toggleDescription, { color: theme.textSecondary }]}>
          Your identity will be hidden from the public
        </Text>
      </View>
      <Switch
        value={isAnonymous}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor={isAnonymous ? '#FFFFFF' : theme.surface}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
  },
});

export default AnonymousToggle;
