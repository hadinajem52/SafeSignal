import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

const MlFeatureToggles = ({
  enableClassification,
  onToggleClassification,
  enableRisk,
  onToggleRisk,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>AI Assistance (Optional)</Text>

      <View style={styles.toggleSection}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Category Suggestion</Text>
          <Text style={styles.toggleDescription}>
            Helps validate your chosen category using ML.
          </Text>
        </View>
        <Switch
          value={enableClassification}
          onValueChange={onToggleClassification}
          trackColor={{ false: '#ddd', true: '#81b0ff' }}
          thumbColor={enableClassification ? '#1a73e8' : '#f4f3f4'}
        />
      </View>

      <View style={styles.toggleSection}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Risk Scoring</Text>
          <Text style={styles.toggleDescription}>
            Uses ML to assess urgency for faster response.
          </Text>
        </View>
        <Switch
          value={enableRisk}
          onValueChange={onToggleRisk}
          trackColor={{ false: '#ddd', true: '#81b0ff' }}
          thumbColor={enableRisk ? '#1a73e8' : '#f4f3f4'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
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
    color: '#333',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#666',
  },
});

export default MlFeatureToggles;
