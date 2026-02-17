import React from 'react';
import { View } from 'react-native';
import { AppText, Button, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './accountStyles';

const DangerZone = ({ onLogout, onDeleteAccount }) => {
  const { theme } = useTheme();

  return (
    <Card style={[styles.dangerContainer, { backgroundColor: `${theme.error}12`, borderColor: `${theme.error}55` }]}> 
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.error }]}>Danger Zone</AppText>
      <AppText variant="caption" style={[styles.dangerHint, { color: theme.textSecondary }]}> 
        These actions are sensitive and may not be reversible.
      </AppText>
      <Button title="Sign Out" onPress={onLogout} style={{ backgroundColor: theme.error }} />
      <View style={styles.dangerSpacing} />
      <Button title="Delete Account" onPress={onDeleteAccount} style={{ backgroundColor: theme.safetyPoor }} />
    </Card>
  );
};

export default DangerZone;
