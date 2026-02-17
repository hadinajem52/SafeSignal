import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AppText, Button } from '../../components';
import { configureGoogleAuth, signInWithGoogle, statusCodes } from '../../services/googleAuth';
import AuthDivider from './AuthDivider';
import AuthFormInput from './AuthFormInput';
import AuthHeader from './AuthHeader';
import authStyles from './authStyles';
import GoogleSignInButton from './GoogleSignInButton';

const LoginScreen = ({ navigation }) => {
  const { login, googleSignIn } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    configureGoogleAuth();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const userInfo = await signInWithGoogle();
      const idToken = userInfo.data?.idToken;
      const googleEmail = userInfo.data?.user?.email;
      const name = userInfo.data?.user?.name;

      if (!idToken || !googleEmail) {
        Alert.alert('Error', 'Failed to get authentication token from Google');
        return;
      }

      const result = await googleSignIn(idToken, googleEmail, name);
      if (!result.success) {
        Alert.alert('Sign-In Failed', result.error || 'Google authentication failed');
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      if (error.code === statusCodes.IN_PROGRESS) {
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
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);

      if (!result.success) {
        if (result.requiresVerification) {
          Alert.alert('Email Not Verified', 'Please verify your email to continue.', [
            {
              text: 'Verify Now',
              onPress: () => navigation.navigate('Verification', { email: result.email }),
            },
            { text: 'Cancel', style: 'cancel' },
          ]);
        } else {
          Alert.alert('Login Failed', result.error || 'Please check your credentials');
        }
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <View style={authStyles.backgroundLayer} pointerEvents="none">
        <LinearGradient
          colors={[theme.primaryLight || 'rgba(29,78,216,0.14)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={authStyles.bgOrbTop}
        />
        <LinearGradient
          colors={[theme.primaryLight || 'rgba(29,78,216,0.14)', 'rgba(255,255,255,0)']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={authStyles.bgOrbBottom}
        />
      </View>
      <ScrollView
        contentContainerStyle={authStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader subtitle="Community safety network" />

        <View style={[authStyles.formContainer, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <AppText variant="h2" style={[authStyles.formTitle, { color: theme.text }]}>Welcome Back</AppText>
          <AppText variant="body" style={[authStyles.formSubtitle, { color: theme.textSecondary }]}>Sign in to your account</AppText>

          <GoogleSignInButton
            title="Continue with Google"
            loading={isGoogleLoading}
            onPress={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          />

          <AuthDivider />

          <View style={authStyles.emailSectionSpacing}>
            <AuthFormInput
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: null }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              error={errors.email}
            />

            <AuthFormInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: null }));
                }
              }}
              secureTextEntry
              editable={!isLoading}
              error={errors.password}
            />
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading || isGoogleLoading}
            style={[authStyles.button, isLoading && authStyles.buttonDisabled]}
          />

          <View style={authStyles.footerContainer}>
            <AppText variant="bodySmall" style={[authStyles.footerText, { color: theme.textSecondary }]}>Don't have an account? </AppText>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={isLoading || isGoogleLoading}>
              <AppText variant="label" style={[authStyles.linkText, { color: theme.primary }]}>Sign Up</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
