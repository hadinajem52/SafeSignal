import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

let isConfigured = false;

export const configureGoogleAuth = () => {
  if (isConfigured) {
    return;
  }

  GoogleSignin.configure({
    webClientId: '148707906240-89fv5lp1aikj89h9pioihipd8m9hej7n.apps.googleusercontent.com',
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
