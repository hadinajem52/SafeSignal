import { StyleSheet } from 'react-native';

const mapStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  filterHeader: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
  },
  controlPanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  segmentFlex: {
    flex: 1,
  },
  collapseToggle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  },
  segmentLabel: {
    marginLeft: 6,
  },
  viewModeSegment: {
    marginTop: 4,
  },
  filterRow: {
    marginTop: 4,
  },

  timeframeContainer: {
    flexDirection: 'row',
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframeText: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  mapHintWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 132,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapHintText: {
    marginLeft: 8,
    flex: 1,
  },

  markerContainer: {
    alignItems: 'center',
  },
  markerIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },

  calloutContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minWidth: 180,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  calloutTitle: {
    marginBottom: 4,
  },
  calloutCategory: {
    marginBottom: 2,
  },
  calloutTime: {
    marginBottom: 5,
  },
  calloutTap: {
    fontStyle: 'italic',
  },

  fabContainer: {
    position: 'absolute',
    right: 14,
    bottom: 142,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },

  countBadge: {
    position: 'absolute',
    bottom: 32,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  countText: {
    marginLeft: 6,
    textTransform: 'capitalize',
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  listIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listRowBody: {
    flex: 1,
    marginRight: 8,
  },
  listTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  listMetaText: {
    flex: 1,
  },
  listOutcomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  listOutcomeText: {
    marginLeft: 4,
    textTransform: 'capitalize',
  },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheetBackDropTouchable: {
    flex: 1,
  },
  detailSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  detailCategoryText: {
    color: '#FFFFFF',
    marginLeft: 6,
  },
  detailTitle: {
    marginBottom: 10,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailMetaText: {
    marginLeft: 6,
    flex: 1,
  },
  detailActions: {
    marginTop: 10,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
});

export default mapStyles;
