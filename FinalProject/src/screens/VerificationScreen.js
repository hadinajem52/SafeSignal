import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import { Button } from '../components';

const VerificationScreen = ({ navigation, route }) => {
  const { email } = route.params;
  const { checkAuthStatus } = useAuth();
  const { theme } = useTheme();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const inputRefs = useRef([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (text, index) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '');
    
    if (digit.length <= 1) {
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      // Auto-focus next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all digits entered
      if (digit && index === 5) {
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
          handleVerify(fullCode);
        }
      }
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

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
        Alert.alert('Success', 'Email verified successfully!', [
          {
            text: 'OK',
            onPress: () => checkAuthStatus(),
          },
        ]);
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid verification code');
        // Clear code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteCode = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      // Extract only digits from clipboard
      const digits = clipboardContent.replace(/[^0-9]/g, '');
      
      if (digits.length >= 6) {
        const newCode = digits.slice(0, 6).split('');
        setCode(newCode);
        // Auto-verify after paste
        handleVerify(newCode.join(''));
      } else if (digits.length > 0) {
        // Partial code - fill what we have
        const newCode = [...code];
        for (let i = 0; i < digits.length && i < 6; i++) {
          newCode[i] = digits[i];
        }
        setCode(newCode);
        // Focus on the next empty input
        const nextEmpty = newCode.findIndex(d => !d);
        if (nextEmpty !== -1) {
          inputRefs.current[nextEmpty]?.focus();
        }
      } else {
        Alert.alert('No Code Found', 'No verification code found in clipboard');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to read clipboard');
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      const result = await authAPI.resendVerificationCode(email);
      
      if (result.success) {
        Alert.alert('Code Sent', 'A new verification code has been sent to your email');
        setCountdown(60); // 60 second cooldown
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.logo}>✉️</Text>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to
          </Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                digit && styles.codeInputFilled,
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!isLoading}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.pasteButton}
          onPress={handlePasteCode}
          disabled={isLoading}
        >
          <Text style={styles.pasteButtonText}>📋 Paste Code</Text>
        </TouchableOpacity>

        <Button
          title="Verify Email"
          onPress={() => handleVerify()}
          loading={isLoading}
          disabled={isLoading || code.join('').length !== 6}
          style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
        />

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <TouchableOpacity
            onPress={handleResendCode}
            disabled={isResending || countdown > 0}
          >
            {isResending ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={[
                styles.resendLink,
                countdown > 0 && styles.resendLinkDisabled,
              ]}>
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to Registration</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 4,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  codeInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  pasteButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  pasteButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonDisabled: {
    backgroundColor: '#b0d4ff',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#999',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#666',
  },
});

export default VerificationScreen;
