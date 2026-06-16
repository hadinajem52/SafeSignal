import { Linking } from 'react-native';
import haptics from './haptics';

// Single source of truth for the local emergency number.
// Set to Lebanon's police line (112). TODO: localize per region if the app expands.
export const EMERGENCY_NUMBER = '112';

// Opens the native dialer pre-filled with the emergency number. We deliberately
// skip Linking.canOpenURL: for the `tel:` scheme it can return false on
// Android 11+ without a <queries> manifest entry, producing false negatives.
// `tel:` only opens the dialer (it does not auto-dial), so an accidental tap is
// recoverable — the user still has to press call.
export const callEmergency = async ({ onError } = {}) => {
  haptics.warning();
  try {
    await Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
    return true;
  } catch {
    onError?.(`Couldn't open the dialer. Please dial ${EMERGENCY_NUMBER} directly.`);
    return false;
  }
};
