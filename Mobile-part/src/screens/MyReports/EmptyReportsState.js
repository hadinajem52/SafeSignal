import React from 'react';
import { EmptyState, EMPTY_ART } from '../../components';

const getEmptyMessage = (selectedFilter) => {
  if (selectedFilter === 'all') {
    return "You haven't submitted any incident reports yet.";
  }
  if (selectedFilter === 'draft') {
    return 'You have no saved drafts.';
  }
  return `You have no ${selectedFilter} reports.`;
};

const EmptyReportsState = ({ selectedFilter, onReportPress }) => (
  <EmptyState
    illustration={selectedFilter === 'all' ? EMPTY_ART.reports : EMPTY_ART.search}
    title="No reports yet"
    message={getEmptyMessage(selectedFilter)}
    actionLabel="Submit your first report"
    onAction={onReportPress}
    style={{ paddingVertical: 70 }}
  />
);

export default EmptyReportsState;
