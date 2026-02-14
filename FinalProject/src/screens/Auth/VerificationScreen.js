import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authAPI } from '../../services/api';
import { Button } from '../../components';
import AuthHeader from './AuthHeader';
import authStyles from './authStyles';

const VerificationScreen = ({ navigation, route }) => {
  const { email } = route.params;
  const { checkAuthStatus } = useAuth();
  const { theme } = useTheme();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async (verificationCode = null) => {
    const codeToVerify = verificationCode || code.join('');

    if (codeToVerify.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authAPI.verifyEmail(email, codeToVerify);

      if (result.success) {
        Alert.alert('Success', 'Email verified successfully!', [{ text: 'OK', onPress: () => checkAuthStatus() }]);
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid verification code');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '');
    if (digit.length > 1) {
      return;
    }

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
        Alert.alert('No Code Found', 'No verification code found in clipboard');
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
      Alert.alert('Error', 'Failed to read clipboard');
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) {
      return;
    }

    setIsResending(true);
    try {
      const result = await authAPI.resendVerificationCode(email);

      if (result.success) {
        Alert.alert('Code Sent', 'A new verification code has been sent to your email');
        setCountdown(60);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', result.error || 'Failed to resend code');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[authStyles.container, { backgroundColor: theme.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={authStyles.verificationContent}>
        <AuthHeader
          icon="✉️"
          title="Verify Your Email"
          titleColor={theme.text}
          subtitle="We've sent a 6-digit code to"
          marginBottom={40}
        >
          <Text style={[authStyles.verificationEmail, { color: theme.codeBorder }]}>{email}</Text>
        </AuthHeader>

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
                  borderColor: digit ? theme.codeBorder : theme.border,
                  backgroundColor: digit ? theme.codeInputBg : theme.card,
                  color: theme.text,
                },
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(event) => handleKeyPress(event, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!isLoading}
            />
          ))}
        </View>

        <TouchableOpacity style={authStyles.pasteButton} onPress={handlePasteCode} disabled={isLoading}>
          <Text style={[authStyles.pasteButtonText, { color: theme.codeBorder }]}>📋 Paste Code</Text>
        </TouchableOpacity>

        <Button
          title="Verify Email"
          onPress={() => handleVerify()}
          loading={isLoading}
          disabled={isLoading || code.join('').length !== 6}
          style={authStyles.button}
        />

        <View style={authStyles.resendContainer}>
          <Text style={[authStyles.resendText, { color: theme.textSecondary }]}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResendCode} disabled={isResending || countdown > 0}>
            {isResending ? (
              <ActivityIndicator size="small" color={theme.codeBorder} />
            ) : (
              <Text
                style={[
                  authStyles.resendLink,
                  { color: countdown > 0 ? theme.textTertiary : theme.codeBorder },
                ]}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={authStyles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[authStyles.backButtonText, { color: theme.textSecondary }]}>← Back to Registration</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default VerificationScreen;
