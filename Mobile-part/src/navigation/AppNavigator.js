import React, { useRef, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import useNotificationForegroundHandler from '../hooks/useNotificationForegroundHandler';
import useRealtimeNotifications from '../hooks/useRealtimeNotifications';
import useWitnessPromptNotifications from '../hooks/useWitnessPromptNotifications';
import useFirstLaunchLocationPrompt from '../hooks/useFirstLaunchLocationPrompt';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import VerificationScreen from '../screens/Auth/VerificationScreen';
import TabNavigator from './TabNavigator';
import WitnessPromptScreen from '../screens/WitnessPromptScreen';

const Stack = createNativeStackNavigator();




const AuthStack = () =>
<Stack.Navigator
  screenOptions={{
    headerShown: false,
    animation: 'slide_from_right'
  }}>

    <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'none' }} />
    <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'none' }} />
    <Stack.Screen name="Verification" component={VerificationScreen} />
  </Stack.Navigator>;





const AppStack = () =>
<Stack.Navigator
  screenOptions={{
    headerShown: false,
    animation: 'slide_from_right'
  }}>

    <Stack.Screen name="MainTabs" component={TabNavigator} />
    <Stack.Screen
    name="WitnessPrompt"
    component={WitnessPromptScreen}
    options={{ animation: 'slide_from_bottom' }} />

  </Stack.Navigator>;





const LoadingScreen = ({ theme }) =>
<View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
    <ActivityIndicator size="large" color={theme.primary} />
  </View>;






const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const navigationRef = useRef(null);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  useNotificationForegroundHandler();
  useRealtimeNotifications();
  useWitnessPromptNotifications({ navigationRef, isNavigationReady });
  useFirstLaunchLocationPrompt();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.primary
    }
  };

  if (isLoading) {
    return <LoadingScreen theme={theme} />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={() => setIsNavigationReady(true)}>

      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>);

};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default AppNavigator;