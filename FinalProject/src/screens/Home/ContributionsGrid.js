import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Card } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './homeStyles';

const ContributionsGrid = ({ userStats }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name="trophy-outline" size={18} color={theme.text} style={styles.sectionTitleIcon} />
        <AppText variant="h4" style={[styles.sectionTitle, { color: theme.text }]}>Your Contributions</AppText>
      </View>
      <Card style={styles.contributionsGrid}>
        <View style={styles.contributionCard}>
          <View style={[styles.contributionIconWrap, { backgroundColor: `${theme.primary}15` }]}>
            <Ionicons name="document-text-outline" size={16} color={theme.primary} />
          </View>
          <AppText variant="h2" style={[styles.contributionNumber, { color: theme.text }]}> 
            {userStats?.totalReports || 0}
          </AppText>
          <AppText variant="small" style={[styles.contributionLabel, { color: theme.textSecondary }]}>Total{`\n`}Reports</AppText>
        </View>
        <View style={styles.contributionCard}>
          <View style={[styles.contributionIconWrap, { backgroundColor: `${theme.accentGreen}15` }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.accentGreen} />
          </View>
          <AppText variant="h2" style={[styles.contributionNumber, { color: theme.accentGreen }]}> 
            {userStats?.verifiedReports || 0}
          </AppText>
          <AppText variant="small" style={[styles.contributionLabel, { color: theme.textSecondary }]}>Verified</AppText>
        </View>
        <View style={styles.contributionCard}>
          <View style={[styles.contributionIconWrap, { backgroundColor: `${theme.accentBlue}15` }]}>
            <Ionicons name="checkmark-done-outline" size={16} color={theme.accentBlue} />
          </View>
          <AppText variant="h2" style={[styles.contributionNumber, { color: theme.accentBlue }]}> 
            {userStats?.resolvedReports || 0}
          </AppText>
          <AppText variant="small" style={[styles.contributionLabel, { color: theme.textSecondary }]}>Resolved</AppText>
        </View>
        <View style={styles.contributionCard}>
          <View style={[styles.contributionIconWrap, { backgroundColor: `${theme.accentOrange}15` }]}>
            <Ionicons name="time-outline" size={16} color={theme.accentOrange} />
          </View>
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
