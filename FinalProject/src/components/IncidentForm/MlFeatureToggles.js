import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const MlFeatureToggles = ({
  enableClassification,
  onToggleClassification,
  enableRisk,
  onToggleRisk,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.header, { color: theme.text }]}>AI Assistance (Optional)</Text>

      <View style={styles.toggleSection}>
        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>Category Suggestion</Text>
          <Text style={[styles.toggleDescription, { color: theme.textSecondary }]}>
            Helps validate your chosen category using ML.
          </Text>
        </View>
        <Switch
          value={enableClassification}
          onValueChange={onToggleClassification}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={enableClassification ? '#FFFFFF' : theme.surface}
        />
      </View>

      <View style={styles.toggleSection}>
        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>Risk Scoring</Text>
          <Text style={[styles.toggleDescription, { color: theme.textSecondary }]}>
            Uses ML to assess urgency for faster response.
          </Text>
        </View>
        <Switch
          value={enableRisk}
          onValueChange={onToggleRisk}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={enableRisk ? '#FFFFFF' : theme.surface}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  header: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
  },
});

export default MlFeatureToggles;
