import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const QuickActions = ({ navigation }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>⚡ Quick Actions</AppText>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ReportIncident')}
        >
          <View
            style={[styles.actionIconContainer, { backgroundColor: `${theme.accentRed}15` }]}
          >
            <AppText style={styles.actionIcon}>📝</AppText>
          </View>
          <AppText variant="caption" style={[styles.actionText, { color: theme.text }]}>Report</AppText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Map')}>
          <View
            style={[styles.actionIconContainer, { backgroundColor: `${theme.accentBlue}15` }]}
          >
            <AppText style={styles.actionIcon}>🗺️</AppText>
          </View>
          <AppText variant="caption" style={[styles.actionText, { color: theme.text }]}>Map</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Reports')}
        >
          <View
            style={[
              styles.actionIconContainer,
              { backgroundColor: `${theme.accentPurple}15` },
            ]}
          >
            <AppText style={styles.actionIcon}>📊</AppText>
          </View>
          <AppText variant="caption" style={[styles.actionText, { color: theme.text }]}>My Reports</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Account')}
        >
          <View
            style={[styles.actionIconContainer, { backgroundColor: `${theme.accentTeal}15` }]}
          >
            <AppText style={styles.actionIcon}>👤</AppText>
          </View>
          <AppText variant="caption" style={[styles.actionText, { color: theme.text }]}>Account</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default QuickActions;
