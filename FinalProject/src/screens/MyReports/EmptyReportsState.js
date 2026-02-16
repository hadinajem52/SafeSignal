import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import styles from './myReportsStyles';

const getEmptyMessage = (selectedFilter) => {
  if (selectedFilter === 'all') {
    return "You haven't submitted any incident reports yet.";
  }
  if (selectedFilter === 'draft') {
    return 'You have no saved drafts.';
  }
  return `You have no ${selectedFilter} reports.`;
};

const EmptyReportsState = ({ selectedFilter, onReportPress }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: theme.primaryLight }]}> 
        <Ionicons name="document-text-outline" size={28} color={theme.primary} />
      </View>
      <AppText variant="h4" style={[styles.emptyTitle, { color: theme.text }]}>No reports yet</AppText>
      <AppText variant="body" style={[styles.emptyText, { color: theme.textSecondary }]}> 
        {getEmptyMessage(selectedFilter)}
      </AppText>
      <Button title="Submit your first report" onPress={onReportPress} style={styles.reportButton} />
    </View>
  );
};

export default EmptyReportsState;
