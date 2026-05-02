import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const getSocketUrl = () => {
  if (!__DEV__) {
    return 'https://your-production-api.com';
  }

  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000`;
  }

  if (Platform.OS === 'android') {
    return 'http://localhost:3000';
  }

  return 'http://localhost:3000';
};

export default getSocketUrl;
