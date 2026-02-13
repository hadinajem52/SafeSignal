import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components';
import { configureGoogleAuth, signInWithGoogle, statusCodes } from '../../services/googleAuth';
import AuthDivider from './AuthDivider';
import AuthFormInput from './AuthFormInput';
import AuthHeader from './AuthHeader';
import authStyles from './authStyles';
import GoogleSignInButton from './GoogleSignInButton';

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

  useEffect(() => {
    configureGoogleAuth();
  }, []);

  const clearError = (field) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const userInfo = await signInWithGoogle();
      const idToken = userInfo.data?.idToken;
      const googleEmail = userInfo.data?.user?.email;
      const name = userInfo.data?.user?.name;

      if (!idToken || !googleEmail) {
        Alert.alert('Error', 'Failed to get authentication token');
        return;
      }

      const result = await googleSignIn(idToken, googleEmail, name);
      if (!result.success) {
        Alert.alert('Sign-Up Failed', result.error || 'Google authentication failed');
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Sign-Up', 'Sign-up is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services is not available');
      } else {
        Alert.alert('Error', 'An error occurred during Google sign-up');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/\d/.test(password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(username.trim(), email.trim().toLowerCase(), password);

      if (result.success) {
        if (result.requiresVerification) {
          navigation.navigate('Verification', { email: result.email || email.trim().toLowerCase() });
        }
      } else if (result.validationErrors) {
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
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[authStyles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={authStyles.scrollContent} keyboardShouldPersistTaps="handled">
        <AuthHeader subtitle="Join the Community" />

        <View style={[authStyles.formContainer, { backgroundColor: theme.card }]}>
          <Text style={[authStyles.formTitle, { color: theme.text }]}>Create Account</Text>
          <Text style={[authStyles.formSubtitle, { color: theme.textSecondary }]}>Sign up to report and track incidents</Text>

          <AuthFormInput
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              clearError('username');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            error={errors.username}
          />

          <AuthFormInput
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearError('email');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            error={errors.email}
          />

          <AuthFormInput
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearError('password');
            }}
            secureTextEntry
            editable={!isLoading}
            error={errors.password}
          />
          <Text style={[authStyles.hintText, { color: theme.textTertiary }]}>At least 6 characters with one number</Text>

          <AuthFormInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              clearError('confirmPassword');
            }}
            secureTextEntry
            editable={!isLoading}
            error={errors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading || isGoogleLoading}
            style={[authStyles.button, isLoading && authStyles.buttonDisabled]}
          />

          <AuthDivider />

          <GoogleSignInButton
            title="Sign up with Google"
            loading={isGoogleLoading}
            onPress={handleGoogleSignUp}
            disabled={isLoading || isGoogleLoading}
          />

          <View style={authStyles.footerContainer}>
            <Text style={[authStyles.footerText, { color: theme.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isLoading || isGoogleLoading}>
              <Text style={[authStyles.linkText, { color: theme.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[authStyles.termsText, { color: theme.textTertiary }]}>By creating an account, you agree to our Terms of Service and Privacy Policy</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;
