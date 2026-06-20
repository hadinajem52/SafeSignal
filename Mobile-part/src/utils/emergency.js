import { Linking } from 'react-native';
import haptics from './haptics';

export const EMERGENCY_NUMBER = '112';

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
