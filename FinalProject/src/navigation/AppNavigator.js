import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerificationScreen from '../screens/VerificationScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

/**
 * Auth Stack - Screens for unauthenticated users
 */
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="Verification" component={VerificationScreen} />
  </Stack.Navigator>
);

/**
 * App Stack - Screens for authenticated users
 */
const AppStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="MainTabs" component={TabNavigator} />
  </Stack.Navigator>
);

/**
 * Loading Screen while checking auth status
 */
const LoadingScreen = ({ theme }) => (
  <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
    <ActivityIndicator size="large" color={theme.primary} />
  </View>
);

/**
 * Main Navigation Component
 * Handles switching between auth and app stacks based on auth state
 */
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, isDark } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
  };

  if (isLoading) {
    return <LoadingScreen theme={theme} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;
