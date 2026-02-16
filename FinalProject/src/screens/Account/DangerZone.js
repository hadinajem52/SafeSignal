import React from 'react';
import { View } from 'react-native';
import { AppText, Button, Card } from '../../components';
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
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Danger Zone</AppText>
      <Button title="Sign Out" onPress={onLogout} style={{ backgroundColor: theme.error }} />
      <View style={styles.dangerSpacing} />
      <Button title="Delete Account" onPress={onDeleteAccount} style={{ backgroundColor: theme.safetyPoor }} />
    </Card>
  );
};

export default DangerZone;
