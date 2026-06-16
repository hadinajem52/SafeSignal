import { StyleSheet } from 'react-native';
import { fontFamilies } from '../../../../constants/typography';

const authStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bgOrbTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 260,
    top: -90,
    right: -70,
    opacity: 0.35,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 220,
    bottom: -80,
    left: -50,
    opacity: 0.22,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 40,
  },


  stickyHeader: {
    paddingHorizontal: 28,
    paddingBottom: 8,
  },


  headerWrap: {
    alignItems: 'center',
  },
  brandBadgeWrap: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  brandBadgeHalo: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  brandBadge: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  brandTitle: {
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  brandTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  brandTagDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginRight: 7,
  },
  brandTagText: {
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  brandSubtitle: {
    textAlign: 'center',
    marginTop: 8,
  },


  formContainer: {
    width: '100%',
  },
  formTitle: {
    marginBottom: 4,
  },
  formSubtitle: {
    marginBottom: 20,
  },
  emailSectionSpacing: {
    marginTop: 4,
  },

  button: {
    marginTop: 10,
    minHeight: 54,
    borderRadius: 14,
  },
  buttonDisabled: {
    opacity: 0.78,
  },

  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {},
  linkText: {},
  termsText: {
    textAlign: 'center',
    marginTop: 22,
    paddingHorizontal: 24,
  },
  hintText: {
    marginTop: -6,
    marginBottom: 10,
    marginLeft: 2,
  },

  verificationScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  verificationContent: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 5,
  },
  verificationEmailPill: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  verificationEmail: {},
  countdownWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  countdownDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 6,
  },
  countdownText: {},

  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  codeInput: {
    width: 50,
    height: 58,
    borderWidth: 1,
    borderRadius: 14,
    textAlign: 'center',
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: 24,
  },
  pasteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 14,
  },
  pasteInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pasteButtonText: {
    marginLeft: 6,
  },

  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  resendText: {},
  resendLink: {},

  backButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  backInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 4,
  },
});

export default authStyles;
