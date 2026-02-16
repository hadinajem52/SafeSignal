import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import authStyles from './authStyles';

const AuthHeader = ({
  iconName = 'shield-checkmark',
  title = 'SafeSignal',
  subtitle,
  titleColor,
  children,
  marginBottom = 28,
}) => {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[authStyles.headerWrap, { marginBottom }]}> 
      <LinearGradient
        colors={[theme.primaryLight || 'rgba(29,78,216,0.2)', 'rgba(255,255,255,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[authStyles.brandHero, { borderColor: theme.border }]}
      >
        <Animated.View
          style={[
            authStyles.brandIconWrap,
            {
              backgroundColor: theme.primary,
              transform: [{ scale: pulse }],
            },
          ]}
        >
          <Ionicons name={iconName} size={28} color="#FFFFFF" />
        </Animated.View>
        <AppText variant="h1" style={[authStyles.brandTitle, { color: titleColor || theme.text }]}> 
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" style={[authStyles.brandSubtitle, { color: theme.textSecondary }]}> 
            {subtitle}
          </AppText>
        ) : null}
        {children}
      </LinearGradient>
    </View>
  );
};

export default AuthHeader;
