import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  backHeader: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 0,
  },

  // ---- Hero (full-bleed) ----
  heroGradient: {
    paddingTop: 24,
    paddingHorizontal: 18,
    paddingBottom: 20,
    alignItems: 'center',
  },
  medallion: {
    width: 172,
    height: 172,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroTitle: {
    textAlign: 'center',
    marginBottom: 4,
  },
  outcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 10,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // ---- Divided sections ----
  // Dividers are full-bleed (no horizontal inset); only content is padded.
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  section: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionText: {
    lineHeight: 21,
  },

  // ---- Location ----
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },

  // ---- Timeline / Messages ----
  timelineContainer: {
    height: 460,
    marginTop: 2,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default styles;
