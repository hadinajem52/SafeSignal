import React from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';

const AnonymousToggle = ({ isAnonymous, onToggle }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.toggleSection, { backgroundColor: theme.card, borderColor: theme.border }]}> 
      <View style={styles.toggleInfo}>
        <View style={styles.labelRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={theme.primary} style={styles.labelIcon} />
          <AppText variant="label" style={[styles.toggleLabel, { color: theme.text }]}>Report Anonymously</AppText>
        </View>
        <AppText variant="caption" style={[styles.toggleDescription, { color: theme.textSecondary }]}> 
          Your identity will be hidden from the public
        </AppText>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelIcon: {
    marginRight: 6,
  },
  toggleLabel: {
  },
  toggleDescription: {
  },
});

export default AnonymousToggle;
