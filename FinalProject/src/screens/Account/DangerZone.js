import React from 'react';
import { Text, View } from 'react-native';
import { Button, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const DangerZone = ({ onLogout, onDeleteAccount }) => {
  const { theme } = useTheme();

  return (
    <Card
      style={[
        styles.settingsContainer,
        { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Danger Zone</Text>
      <Button title="Sign Out" onPress={onLogout} style={{ backgroundColor: theme.error }} />
      <View style={styles.dangerSpacing} />
      <Button title="Delete Account" onPress={onDeleteAccount} style={{ backgroundColor: theme.safetyPoor }} />
    </Card>
  );
};

export default DangerZone;
