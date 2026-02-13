import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const QuickActions = ({ navigation }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>⚡ Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ReportIncident')}
        >
          <View
            style={[styles.actionIconContainer, { backgroundColor: `${theme.accentRed}15` }]}
          >
            <Text style={styles.actionIcon}>📝</Text>
          </View>
          <Text style={[styles.actionText, { color: theme.text }]}>Report</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Map')}>
          <View
            style={[styles.actionIconContainer, { backgroundColor: `${theme.accentBlue}15` }]}
          >
            <Text style={styles.actionIcon}>🗺️</Text>
          </View>
          <Text style={[styles.actionText, { color: theme.text }]}>Map</Text>
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
            <Text style={styles.actionIcon}>📊</Text>
          </View>
          <Text style={[styles.actionText, { color: theme.text }]}>My Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Account')}
        >
          <View
            style={[styles.actionIconContainer, { backgroundColor: `${theme.accentTeal}15` }]}
          >
            <Text style={styles.actionIcon}>👤</Text>
          </View>
          <Text style={[styles.actionText, { color: theme.text }]}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default QuickActions;
