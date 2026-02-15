import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const QuickActions = ({ navigation }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name="flash" size={18} color={theme.text} style={styles.sectionTitleIcon} />
        <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</AppText>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('ReportIncident')}
        >
          <View
            style={[styles.actionIconContainer, { backgroundColor: `${theme.accentRed}15` }]}
          >
            <Ionicons name="create-outline" size={22} color={theme.accentRed} />
          </View>
          <AppText variant="caption" style={[styles.actionText, { color: theme.text }]}>Report</AppText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Map')}>
          <View
            style={[styles.actionIconContainer, { backgroundColor: `${theme.accentBlue}15` }]}
          >
            <Ionicons name="map-outline" size={22} color={theme.accentBlue} />
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
            <Ionicons name="stats-chart-outline" size={22} color={theme.accentPurple} />
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
            <Ionicons name="person-outline" size={22} color={theme.accentTeal} />
          </View>
          <AppText variant="caption" style={[styles.actionText, { color: theme.text }]}>Account</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default QuickActions;
