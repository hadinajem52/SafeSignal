import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

let isConfigured = false;
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const configureGoogleAuth = () => {
  if (isConfigured) {
    return;
  }

  if (!googleWebClientId) {
    throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured');
  }

  GoogleSignin.configure({
    webClientId: googleWebClientId,
    offlineAccess: true,
  });

  isConfigured = true;
};

export const signInWithGoogle = async () => {
  configureGoogleAuth();
  await GoogleSignin.hasPlayServices();

  if (GoogleSignin.hasPreviousSignIn()) {
    await GoogleSignin.signOut();
  }

  return GoogleSignin.signIn();
};

export { statusCodes };
