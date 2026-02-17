import { StyleSheet } from 'react-native';

const myReportsStyles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 56,
  },
  loadingText: {
    marginTop: 14,
  },
  skeletonHeader: {
    height: 48,
    borderRadius: 14,
    marginBottom: 10,
  },
  skeletonFilterRow: {
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14,
  },
  skeletonCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  skeletonLineWide: {
    height: 14,
    borderRadius: 7,
    marginBottom: 10,
    width: '80%',
  },
  skeletonLineMid: {
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
    width: '55%',
  },
  skeletonLineShort: {
    height: 10,
    borderRadius: 5,
    width: '35%',
  },

  headerBand: {
    marginTop: 42,
    marginHorizontal: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    letterSpacing: 0.2,
  },
  headerCount: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  filterContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    textTransform: 'capitalize',
  },

  listContainer: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
  },

  incidentCard: {
    marginBottom: 12,
  },
  incidentCardInner: {
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLabel: {
    textTransform: 'capitalize',
    marginLeft: 6,
  },
  badgesRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    alignSelf: 'flex-end',
  },
  severityBadge: {
    alignSelf: 'flex-end',
    marginBottom: 6,
  },

  incidentTitle: {
    marginBottom: 6,
  },
  incidentDescription: {
    marginBottom: 12,
  },

  progressSection: {
    marginBottom: 12,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStepWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    borderRadius: 999,
  },
  progressLabels: {
    marginTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    flex: 1,
    textAlign: 'left',
    fontSize: 10,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    flex: 1,
  },
  dateText: {
    textTransform: 'lowercase',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 28,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  reportButton: {
    alignSelf: 'center',
    minWidth: 230,
  },
});

export default myReportsStyles;
