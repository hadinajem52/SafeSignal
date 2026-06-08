import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontFamilies } from '../../../../constants/typography';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';

const AuthFormInput = ({ label, error, icon, style, secureTextEntry, ...inputProps }) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) {
      return;
    }

    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [error, shake]);

  const borderColor = error ? theme.inputError : focused ? theme.primary : theme.inputBorder;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateX: shake.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-5, 0, 5],
              }),
            },
          ],
        },
      ]}
    >
      <AppText variant="label" style={[styles.label, { color: theme.text }]}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.input,
            borderColor,
            shadowColor: focused ? theme.primary : 'transparent',
          },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={error ? theme.inputError : focused ? theme.primary : theme.inputPlaceholder}
            style={styles.leadingIcon}
          />
        ) : null}
        <TextInput
          style={[styles.input, { color: theme.text }, style]}
          placeholderTextColor={theme.inputPlaceholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry && !revealed}
          {...inputProps}
        />
        {secureTextEntry ? (
          <Pressable
            hitSlop={10}
            onPress={() => setRevealed((prev) => !prev)}
            style={styles.trailingButton}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={theme.textTertiary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" style={[styles.errorText, { color: theme.inputError }]}>
          {error}
        </AppText>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 1,
  },
  leadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: fontFamilies.body,
    fontSize: 16,
  },
  trailingButton: {
    paddingLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 5,
    marginLeft: 2,
  },
});

export default AuthFormInput;
