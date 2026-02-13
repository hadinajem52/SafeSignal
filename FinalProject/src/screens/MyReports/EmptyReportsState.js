import React from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components';
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
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Reports Yet</Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{getEmptyMessage(selectedFilter)}</Text>
      <Button title="Report an Incident" onPress={onReportPress} style={styles.reportButton} />
    </View>
  );
};

export default EmptyReportsState;
