import React from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { AppText } from '../../components';
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
      <AppText variant="label" style={[styles.header, { color: theme.text }]}>AI Assistance (Optional)</AppText>

      <View style={styles.toggleSection}>
        <View style={styles.toggleInfo}>
          <AppText variant="bodySmall" style={[styles.toggleLabel, { color: theme.text }]}>Category Suggestion</AppText>
          <AppText variant="small" style={[styles.toggleDescription, { color: theme.textSecondary }]}> 
            Helps validate your chosen category using ML.
          </AppText>
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
          <AppText variant="bodySmall" style={[styles.toggleLabel, { color: theme.text }]}>Risk Scoring</AppText>
          <AppText variant="small" style={[styles.toggleDescription, { color: theme.textSecondary }]}> 
            Uses ML to assess urgency for faster response.
          </AppText>
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
    marginBottom: 4,
  },
  toggleDescription: {
  },
});

export default MlFeatureToggles;
