import React, { createContext, useCallback, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider as RestyleThemeProvider } from '@shopify/restyle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../../../constants/theme';
import { buildRestyleTheme } from '../theme/restyleTheme';

const ThemeContext = createContext(null);





export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState('system');
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);


  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;
  const restyleTheme = useMemo(() => buildRestyleTheme(theme), [theme]);


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




  const setThemeMode = useCallback(async (newMode) => {
    try {
      setMode(newMode);
      await AsyncStorage.setItem('theme_mode', newMode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }, []);


  const value = useMemo(
    () => ({ theme, mode, isDark, setThemeMode, isLoadingTheme }),
    [theme, mode, isDark, setThemeMode, isLoadingTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <RestyleThemeProvider theme={restyleTheme}>{children}</RestyleThemeProvider>
    </ThemeContext.Provider>
  );
};




export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
