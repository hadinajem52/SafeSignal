import React, { useState } from 'react';
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

const RegisterScreen = ({ navigation }) => {
  const { register, googleSignIn } = useAuth();
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const hasPreviousSignIn = GoogleSignin.hasPreviousSignIn();
      if (hasPreviousSignIn) {
        // Force account picker by clearing the last signed-in user.
        await GoogleSignin.signOut();
      }
      const userInfo = await GoogleSignin.signIn();
      
      const idToken = userInfo.data?.idToken;
      const email = userInfo.data?.user?.email;
      const name = userInfo.data?.user?.name;
      
      if (idToken && email) {
        const result = await googleSignIn(idToken, email, name);
        if (!result.success) {
          Alert.alert('Sign-Up Failed', result.error || 'Google authentication failed');
        }
      } else {
        Alert.alert('Error', 'Failed to get authentication token');
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Sign-Up', 'Sign-up is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services is not available');
      } else {
        console.error('Google Sign-Up Error:', error);
        Alert.alert('Error', 'An error occurred during Google sign-up');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/\d/.test(password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await register(username.trim(), email.trim().toLowerCase(), password);

      if (result.success) {
        // Navigate to verification screen
        if (result.requiresVerification) {
          navigation.navigate('Verification', { email: result.email || email.trim().toLowerCase() });
        }
      } else {
        if (result.validationErrors) {
          // Handle server-side validation errors
          const serverErrors = {};
          result.validationErrors.forEach((err) => {
            if (err.path) {
              serverErrors[err.path] = err.msg;
            }
          });
          setErrors(serverErrors);
        } else {
          Alert.alert('Registration Failed', result.error || 'Please try again');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
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
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Join the Community</Text>
        </View>

        <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>Sign up to report and track incidents</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }, errors.username && styles.inputError]}
              placeholder="Choose a username"
              placeholderTextColor={theme.textTertiary}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                clearError('username');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.username && <Text style={[styles.errorText, { color: theme.statusError }]}>{errors.username}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }, errors.email && styles.inputError]}
              placeholder="Enter your email"
              placeholderTextColor={theme.textTertiary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearError('email');
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
              placeholder="Create a password"
              placeholderTextColor={theme.textTertiary}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearError('password');
              }}
              secureTextEntry
              editable={!isLoading}
            />
            {errors.password && <Text style={[styles.errorText, { color: theme.statusError }]}>{errors.password}</Text>}
            <Text style={[styles.hintText, { color: theme.textTertiary }]}>At least 6 characters with one number</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }, errors.confirmPassword && styles.inputError]}
              placeholder="Confirm your password"
              placeholderTextColor={theme.textTertiary}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearError('confirmPassword');
              }}
              secureTextEntry
              editable={!isLoading}
            />
            {errors.confirmPassword && (
              <Text style={[styles.errorText, { color: theme.statusError }]}>{errors.confirmPassword}</Text>
            )}
          </View>

          <Button
            title="Create Account"
            onPress={handleRegister}
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
            onPress={handleGoogleSignUp}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.googleButtonText, { color: theme.text }]}>Sign up with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading || isGoogleLoading}
            >
              <Text style={[styles.linkText, { color: theme.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.termsText, { color: theme.textTertiary }]}>
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </Text>
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
    marginBottom: 30,
  },
  logo: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    padding: 14,
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
  hintText: {
    fontSize: 11,
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
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
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

export default RegisterScreen;
