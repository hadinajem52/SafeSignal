import React from 'react';
import { Text, View } from 'react-native';
import { Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const ContributionsGrid = ({ userStats }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Your Contributions</Text>
      <Card style={styles.contributionsGrid}>
        <View style={styles.contributionCard}>
          <Text style={[styles.contributionNumber, { color: theme.text }]}>
            {userStats?.totalReports || 0}
          </Text>
          <Text style={[styles.contributionLabel, { color: theme.textSecondary }]}>Total{'
        </View>
        <View style={styles.contributionCard}>
          <Text style={[styles.contributionNumber, { color: theme.accentGreen }]}>
            {userStats?.verifiedReports || 0}
          </Text>
          <Text style={[styles.contributionLabel, { color: theme.textSecondary }]}>Verified</Text>
        </View>
        <View style={styles.contributionCard}>
          <Text style={[styles.contributionNumber, { color: theme.accentBlue }]}>
            {userStats?.resolvedReports || 0}
          </Text>
          <Text style={[styles.contributionLabel, { color: theme.textSecondary }]}>Resolved</Text>
        </View>
        <View style={styles.contributionCard}>
          <Text style={[styles.contributionNumber, { color: theme.accentOrange }]}>
            {userStats?.pendingReports || 0}
          </Text>
          <Text style={[styles.contributionLabel, { color: theme.textSecondary }]}>Pending</Text>
        </View>
      </Card>
    </View>
  );
};

export default ContributionsGrid;
