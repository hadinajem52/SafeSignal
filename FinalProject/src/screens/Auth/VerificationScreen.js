import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { fontFamilies } from '../../../../constants/typography';
import { AppText, Button } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { authAPI } from '../../services/api';
import AuthHeader from './AuthHeader';
import authStyles from './authStyles';

const VerificationScreen = ({ navigation, route }) => {
  const email = route?.params?.email ?? '';
  const { checkAuthStatus } = useAuth();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifyError, setVerifyError] = useState('');
  const inputRefs = useRef([]);
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async (verificationCode = null) => {
    if (!email) {
      showToast('Missing verification email. Please register again.', 'error');
      return;
    }

    const codeToVerify = verificationCode || code.join('');

    if (codeToVerify.length !== 6) {
      return;
    }

    setIsLoading(true);
    setVerifyError('');
    try {
      const result = await authAPI.verifyEmail(email, codeToVerify);

      if (result.success) {
        showToast('Email verified successfully!', 'success', 2000);
        checkAuthStatus();
      } else {
        setVerifyError(result.error || 'Invalid verification code');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (text, index) => {
    if (verifyError) setVerifyError('');
    const digits = text.replace(/[^0-9]/g, '');

    if (digits.length > 1) {
      const nextCode = [...code];
      for (let i = 0; i < digits.length && index + i < 6; i += 1) {
        nextCode[index + i] = digits[i];
      }
      setCode(nextCode);

      const fullCode = nextCode.join('');
      if (fullCode.length === 6 && !nextCode.includes('')) {
        handleVerify(fullCode);
      } else {
        const nextEmpty = nextCode.findIndex((value) => !value);
        if (nextEmpty !== -1) {
          inputRefs.current[nextEmpty]?.focus();
        }
      }
      return;
    }

    const digit = digits;
    const nextCode = [...code];
    nextCode[index] = digit;
    setCode(nextCode);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const fullCode = nextCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyPress = (event, index) => {
    if (event.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePasteCode = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      const digits = clipboardContent.replace(/[^0-9]/g, '');

      if (digits.length >= 6) {
        const fullCode = digits.slice(0, 6).split('');
        setCode(fullCode);
        handleVerify(fullCode.join(''));
        return;
      }

      if (digits.length === 0) {
        showToast('No verification code found in clipboard', 'info');
        return;
      }

      const partialCode = [...code];
      for (let i = 0; i < digits.length && i < 6; i += 1) {
        partialCode[i] = digits[i];
      }
      setCode(partialCode);

      const nextEmpty = partialCode.findIndex((digit) => !digit);
      if (nextEmpty !== -1) {
        inputRefs.current[nextEmpty]?.focus();
      }
    } catch (error) {
      showToast('Failed to read clipboard', 'error');
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      showToast('Missing verification email. Please register again.', 'error');
      return;
    }

    if (countdown > 0) {
      return;
    }

    setIsResending(true);
    try {
      const result = await authAPI.resendVerificationCode(email);

      if (result.success) {
        showToast('A new verification code has been sent to your email', 'success');
        setCountdown(60);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        showToast(result.error || 'Failed to resend code', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsResending(false);
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
        contentContainerStyle={authStyles.verificationScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[authStyles.verificationContent, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <AuthHeader
            iconName="mail-unread"
            title="Verify your email"
            titleColor={theme.text}
            subtitle="Enter the 6-digit code we sent to"
            marginBottom={20}
          >
            <View
              style={[
                authStyles.verificationEmailPill,
                {
                  backgroundColor: theme.codeInputBg,
                  borderColor: theme.codeBorder,
                },
              ]}
            >
              <AppText variant="label" style={[authStyles.verificationEmail, { color: theme.codeBorder }]}> 
                {email}
              </AppText>
            </View>
          </AuthHeader>

          <View style={authStyles.countdownWrap}>
            <Animated.View style={[authStyles.countdownDot, { backgroundColor: theme.primary, opacity: pulse }]} />
            <AppText variant="caption" style={[authStyles.countdownText, { color: theme.textSecondary }]}> 
              {countdown > 0 ? `Code expires in ${countdown}s` : 'Resend is available now'}
            </AppText>
          </View>

          <View style={authStyles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  authStyles.codeInput,
                  {
                    borderColor: digit ? theme.codeBorder : theme.inputBorder,
                    backgroundColor: digit ? theme.codeInputBg : theme.input,
                    color: theme.text,
                  },
                ]}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(event) => handleKeyPress(event, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                editable={!isLoading}
              />
            ))}
          </View>

          {!!verifyError && (
            <AppText
              variant="bodySmall"
              style={{ color: '#ef4444', textAlign: 'center', marginTop: 8, marginBottom: 2 }}
            >
              {verifyError}
            </AppText>
          )}

          <TouchableOpacity style={authStyles.pasteButton} onPress={handlePasteCode} disabled={isLoading}>
            <View style={authStyles.pasteInner}>
              <Ionicons name="clipboard-outline" size={16} color={theme.codeBorder} />
              <AppText variant="label" style={[authStyles.pasteButtonText, { color: theme.codeBorder }]}> 
                Paste code
              </AppText>
            </View>
          </TouchableOpacity>

          <Button
            title="Verify Email"
            onPress={() => handleVerify()}
            loading={isLoading}
            disabled={isLoading || !email || code.join('').length !== 6}
            style={authStyles.button}
          />

          <View style={authStyles.resendContainer}>
            <AppText variant="bodySmall" style={[authStyles.resendText, { color: theme.textSecondary }]}> 
              Didn't receive the code? 
            </AppText>
            <TouchableOpacity onPress={handleResendCode} disabled={isResending || !email || countdown > 0}>
              {isResending ? (
                <ActivityIndicator size="small" color={theme.codeBorder} />
              ) : (
                <AppText
                  variant="label"
                  style={[authStyles.resendLink, { color: countdown > 0 ? theme.textTertiary : theme.codeBorder }]}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </AppText>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={authStyles.backButton} onPress={() => navigation.goBack()}>
            <View style={authStyles.backInner}>
              <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
              <AppText variant="bodySmall" style={[authStyles.backButtonText, { color: theme.textSecondary }]}> 
                Back to registration
              </AppText>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default VerificationScreen;
