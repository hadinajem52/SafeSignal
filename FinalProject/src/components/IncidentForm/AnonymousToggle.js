import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

const AnonymousToggle = ({ isAnonymous, onToggle }) => {
  return (
    <View style={styles.toggleSection}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>🕵️ Report Anonymously</Text>
        <Text style={styles.toggleDescription}>
          Your identity will be hidden from the public
        </Text>
      </View>
      <Switch
        value={isAnonymous}
        onValueChange={onToggle}
        trackColor={{ false: '#ddd', true: '#81b0ff' }}
        thumbColor={isAnonymous ? '#1a73e8' : '#f4f3f4'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#666',
  },
});

export default AnonymousToggle;
