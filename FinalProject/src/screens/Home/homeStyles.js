import { StyleSheet } from 'react-native';

const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },

  loadingContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 14,
    textAlign: 'center',
  },
  skeletonHeader: {
    height: 88,
    borderRadius: 18,
    marginBottom: 14,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  skeletonCardLarge: {
    height: 146,
    borderRadius: 16,
    marginBottom: 14,
  },
  skeletonCardSmall: {
    width: '48.5%',
    height: 104,
    borderRadius: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 34,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  greeting: {},
  subtitle: {
    marginTop: 4,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },

  safetyCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  safetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  safetyTitle: {},
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  locationBadgeText: {
    marginLeft: 4,
  },
  safetyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreRing: {
    width: 92,
    height: 92,
    borderRadius: 999,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  scoreCircle: {
    width: 78,
    height: 78,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    lineHeight: 30,
  },
  scoreLabel: {
    marginTop: 1,
  },
  safetyInfo: {
    flex: 1,
  },
  safetyDescription: {},
  safetyNote: {
    marginTop: 8,
  },
  safetyCtaButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },

  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  quickStatPressable: {
    width: '48.5%',
  },
  quickStatCard: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  activeCard: {
    borderTopWidth: 3,
  },
  resolvedCard: {
    borderTopWidth: 3,
  },
  quickStatIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStatIcon: {},
  quickStatNumber: {
    lineHeight: 32,
  },
  quickStatLabel: {
    textAlign: 'center',
    marginTop: 3,
  },

  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleIcon: {
    marginRight: 8,
    marginBottom: 10,
  },

  trendingScrollContent: {
    paddingRight: 6,
  },
  trendingItem: {
    width: 250,
    marginRight: 10,
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  trendingInfo: {
    flex: 1,
  },
  trendingCategory: {},
  trendingCount: {
    marginTop: 2,
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  trendText: {},

  contributionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
  },
  contributionCard: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contributionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  contributionNumber: {},
  contributionLabel: {
    textAlign: 'center',
    marginTop: 4,
  },

  suggestionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  suggestionTitle: {
    flex: 1,
  },
  suggestionDescription: {},
  suggestionFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  activityContainer: {
    borderRadius: 16,
    paddingVertical: 6,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  activityTimelineColumn: {
    width: 14,
    alignItems: 'center',
    marginRight: 10,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 5,
  },
  activityConnector: {
    width: 2,
    height: 26,
    marginTop: 3,
    borderRadius: 999,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {},
  activityType: {
    marginTop: 2,
    textTransform: 'capitalize',
  },
  activityTime: {
    marginLeft: 8,
    marginTop: 2,
  },

  errorContainer: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
  },
  errorText: {
    textAlign: 'center',
  },
  retryText: {
    marginTop: 8,
  },
  alertBanner: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  alertBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertBannerText: {
    marginLeft: 8,
    flex: 1,
  },
  bottomSpacing: {
    height: 14,
  },
});

export default homeStyles;
