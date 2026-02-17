import { StyleSheet } from 'react-native';

const accountStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingBottom: 28,
  },
  title: {
    marginTop: 44,
    marginBottom: 16,
  },

  profileHeader: {
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  profileHeaderGradient: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {},
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 999,
  },
  avatarEdit: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  profileInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {},
  editButton: {
    marginLeft: 8,
  },
  memberSince: {
    marginTop: 4,
  },
  emailValue: {
    marginTop: 6,
  },

  settingsContainer: {
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionTitle: {
    marginBottom: 10,
  },

  themePreviewRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  themePreviewCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  themePreviewDivider: {
    width: 8,
  },
  themePreviewTitle: {
    marginBottom: 8,
  },
  themePreviewBar: {
    height: 8,
    borderRadius: 999,
    marginBottom: 5,
  },
  themePreviewBarShort: {
    width: '70%',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    marginBottom: 3,
  },
  settingHint: {},
  inlineFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineFeedbackText: {
    marginLeft: 6,
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  linkText: {},
  linkArrow: {},

  moreToggle: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  accessStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  accessStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  accessStatusIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  accessStatusLabel: {
    marginBottom: 2,
  },
  accessStatusHint: {},
  accessStatusValue: {
    textTransform: 'uppercase',
  },
  accessStatusFooter: {
    alignItems: 'flex-start',
    paddingTop: 10,
  },

  dangerContainer: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  dangerHint: {
    marginBottom: 10,
  },
  dangerSpacing: {
    height: 10,
  },

  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: '100%',
  },
  modalTitle: {
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    marginLeft: 10,
    minWidth: 104,
  },
});

export default accountStyles;
