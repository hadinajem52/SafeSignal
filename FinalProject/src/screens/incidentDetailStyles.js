import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  headerCard: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
  },
  badgesRow: {
    alignItems: 'flex-end',
    gap: 6,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
  },
  outcomeText: {
    marginTop: 4,
  },
  sectionCard: {
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 6,
  },
  sectionText: {
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
  },
  timelineCard: {
    marginBottom: 12,
    padding: 12,
  },
  timelineContainer: {
    height: 400,
    marginTop: 8,
  },
});

export default styles;
