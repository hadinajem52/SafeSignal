import React from 'react';
import { View } from 'react-native';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const ContributionsGrid = ({ userStats }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>🏆 Your Contributions</AppText>
      <Card style={styles.contributionsGrid}>
        <View style={styles.contributionCard}>
          <AppText variant="h2" style={[styles.contributionNumber, { color: theme.text }]}> 
            {userStats?.totalReports || 0}
          </AppText>
          <AppText variant="small" style={[styles.contributionLabel, { color: theme.textSecondary }]}>Total{`\n`}Reports</AppText>
        </View>
        <View style={styles.contributionCard}>
          <AppText variant="h2" style={[styles.contributionNumber, { color: theme.accentGreen }]}> 
            {userStats?.verifiedReports || 0}
          </AppText>
          <AppText variant="small" style={[styles.contributionLabel, { color: theme.textSecondary }]}>Verified</AppText>
        </View>
        <View style={styles.contributionCard}>
          <AppText variant="h2" style={[styles.contributionNumber, { color: theme.accentBlue }]}> 
            {userStats?.resolvedReports || 0}
          </AppText>
          <AppText variant="small" style={[styles.contributionLabel, { color: theme.textSecondary }]}>Resolved</AppText>
        </View>
        <View style={styles.contributionCard}>
          <AppText variant="h2" style={[styles.contributionNumber, { color: theme.accentOrange }]}> 
            {userStats?.pendingReports || 0}
          </AppText>
          <AppText variant="small" style={[styles.contributionLabel, { color: theme.textSecondary }]}>Pending</AppText>
        </View>
      </Card>
    </View>
  );
};

export default ContributionsGrid;
