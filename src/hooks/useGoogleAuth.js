import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState, useCallback } from 'react';

// Complete auth session for web browser redirect
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
// Get these from Google Cloud Console: https://console.cloud.google.com/apis/credentials
const GOOGLE_CONFIG = {
  expoClientId: 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
};

/**
 * Custom hook for Google Authentication
 * Handles the OAuth flow and returns auth state and methods
 */
export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Configure Google Auth request
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_CONFIG.expoClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    webClientId: GOOGLE_CONFIG.webClientId,
    scopes: ['profile', 'email'],
  });

  /**
   * Start Google Sign-In flow
   */
  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await promptAsync();
      return result;
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [promptAsync]);

  /**
   * Get ID token from authentication response
   */
  const getIdToken = useCallback(async (authResponse) => {
    if (authResponse?.type === 'success') {
      const { authentication } = authResponse;
      
      // For expo-auth-session, we get an access token
      // We need to exchange it for user info or use the id_token if available
      if (authentication?.idToken) {
        return authentication.idToken;
      }
      
      // If no id_token, we can use the access token to get user info
      if (authentication?.accessToken) {
        return authentication.accessToken;
      }
    }
    return null;
  }, []);

  return {
    request,
    response,
    isLoading,
    error,
    signInWithGoogle,
    getIdToken,
    isReady: !!request,
  };
};

export default useGoogleAuth;
