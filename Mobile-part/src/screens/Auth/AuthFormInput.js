import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TextInput, View } from 'react-native';
import { fontFamilies } from '../../../../constants/typography';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';

const AuthFormInput = ({ label, error, style, ...inputProps }) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
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
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.input,
            borderColor: error ? theme.inputError : focused ? theme.primary : theme.inputBorder,
            shadowColor: focused ? theme.primary : theme.shadow,
            color: theme.text,
          },
          style,
        ]}
        placeholderTextColor={theme.inputPlaceholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...inputProps}
      />
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
    marginBottom: 14,
  },
  label: {
    marginBottom: 6,
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 1,
  },
  errorText: {
    marginTop: 4,
  },
});

export default AuthFormInput;
