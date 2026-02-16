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
    left: 10,
    right: 10,
    paddingBottom: 8,
  },
  filterRow: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 4,
  },

  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
  },
  timeframeButton: {
    minWidth: 58,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
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
  errorText: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
});

export default mapStyles;
