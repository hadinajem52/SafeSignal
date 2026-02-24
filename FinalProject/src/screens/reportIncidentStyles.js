import { StyleSheet } from 'react-native';

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
    position: 'absolute',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIcon: {
    marginRight: 10,
  },
  noticeText: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  actionButtonsContainer: {
    marginTop: 20,
    gap: 12,
  },
  draftButton: {
    marginBottom: 10,
  },
  submitButton: {
    borderWidth: 0,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
});

export default styles;
