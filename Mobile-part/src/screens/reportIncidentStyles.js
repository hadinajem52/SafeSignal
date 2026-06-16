import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  draftBadge: {
    position: "absolute",
    right: 20,
    top: 55,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noticeContainer: {
    borderWidth: 1,
    padding: 15,
    margin: 20,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  noticeIcon: {
    marginRight: 10,
  },
  noticeText: {
    flex: 1,
  },
  noticeCallPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 10,
  },
  noticeCallPillText: {
    color: "#FFFFFF",
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  privacyNoteIcon: {
    marginTop: 1,
  },
  privacyNoteText: {
    flex: 1,
    lineHeight: 17,
  },
  formContainer: {
    padding: 20,
  },
  submitSuccessBanner: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitSuccessText: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  stickyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerDraftButton: {
    flex: 1,
  },
  footerSubmitButton: {
    flex: 1.4,
    borderWidth: 0,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
});

export default styles;
