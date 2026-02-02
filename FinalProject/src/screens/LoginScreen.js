import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '148707906240-89fv5lp1aikj89h9pioihipd8m9hej7n.apps.googleusercontent.com',
  offlineAccess: true,
});

const LoginScreen = ({ navigation }) => {
  const { login, googleSignIn } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const hasPreviousSignIn = GoogleSignin.hasPreviousSignIn();
      if (hasPreviousSignIn) {
        // Force account picker by clearing the last signed-in user.
        await GoogleSignin.signOut();
      }
      const userInfo = await GoogleSignin.signIn();
      
      // Get the ID token and user info
      const idToken = userInfo.data?.idToken;
      const email = userInfo.data?.user?.email;
      const name = userInfo.data?.user?.name;
      console.log('Google Sign-In success');
      console.log('- idToken received:', !!idToken);
      console.log('- idToken length:', idToken?.length);
      console.log('- email received:', email);
      console.log('- name received:', name);
      console.log('- userInfo keys:', Object.keys(userInfo.data || {}));
      
      if (idToken && email) {
        console.log('Sending idToken and email to backend...');
        const result = await googleSignIn(idToken, email, name);
        console.log('Backend response:', result);
        
        if (!result.success) {
          console.error('Backend error:', result.error);
          Alert.alert('Sign-In Failed', result.error || 'Google authentication failed');
        } else {
          console.log('Google sign-in successful!');
        }
      } else {
        console.error('No idToken in userInfo:', JSON.stringify(userInfo, null, 2));
        Alert.alert('Error', 'Failed to get authentication token from Google');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Sign-In', 'Sign-in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services is not available');
      } else {
        Alert.alert('Error', `An error occurred: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);

      if (!result.success) {
        // Check if user needs to verify email
        if (result.requiresVerification) {
          Alert.alert(
            'Email Not Verified',
            'Please verify your email to continue.',
            [
              {
                text: 'Verify Now',
                onPress: () => navigation.navigate('Verification', { email: result.email }),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert('Login Failed', result.error || 'Please check your credentials');
        }
      }
      // Navigation will happen automatically through auth state change
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={styles.logo}>🛡️</Text>
          <Text style={[styles.title, { color: theme.primary }]}>SafeSignal</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Community Safety Network</Text>
        </View>

        <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>Sign in to your account</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }, errors.email && styles.inputError]}
              placeholder="Enter your email"
              placeholderTextColor={theme.textTertiary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.email && <Text style={[styles.errorText, { color: theme.statusError }]}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }, errors.password && styles.inputError]}
              placeholder="Enter your password"
              placeholderTextColor={theme.textTertiary}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              secureTextEntry
              editable={!isLoading}
            />
            {errors.password && <Text style={[styles.errorText, { color: theme.statusError }]}>{errors.password}</Text>}
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading || isGoogleLoading}
            style={[styles.button, isLoading && styles.buttonDisabled]}
          />

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { borderColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textTertiary }]}>or</Text>
            <View style={[styles.divider, { borderColor: theme.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: theme.card, borderColor: theme.border }, isGoogleLoading && styles.googleButtonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.googleButtonText, { color: theme.text }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading || isGoogleLoading}
            >
              <Text style={[styles.linkText, { color: theme.primary }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  formContainer: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
