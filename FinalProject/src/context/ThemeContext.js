import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../../../constants/theme';

const ThemeContext = createContext(null);

/**
 * Theme Provider Component
 * Manages theme state and provides theme + toggle globally
 */
export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState('system'); // 'light' | 'dark' | 'system'
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  // Resolve actual theme based on mode
  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  // Load theme preference from storage on app start
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('theme_mode');
        if (saved) {
          setMode(saved);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoadingTheme(false);
      }
    };

    loadThemePreference();
  }, []);

  /**
   * Set theme mode and persist to storage
   */
  const setThemeMode = async (newMode) => {
    try {
      setMode(newMode);
      await AsyncStorage.setItem('theme_mode', newMode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const value = {
    theme,
    mode,
    isDark,
    setThemeMode,
    isLoadingTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Custom hook to use theme context
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
