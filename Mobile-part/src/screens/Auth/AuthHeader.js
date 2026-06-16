import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components';
import { useTheme } from '../../context/ThemeContext';
import authStyles from './authStyles';

const AuthHeader = ({
  iconName = 'shield-checkmark',
  title = 'SafeSignal',
  subtitle,
  titleColor,
  children,
  marginBottom = 32,
  tagSubtitle = true
}) => {
  const { theme } = useTheme();
  const halo = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      halo.stopAnimation();
      halo.setValue(0); // keep the halo invisible/static when reduced motion is on
      return undefined;
    }
    const haloLoop = Animated.loop(
      Animated.timing(halo, { toValue: 1, duration: 2600, useNativeDriver: true })
    );
    haloLoop.start();
    return () => haloLoop.stop();
  }, [halo, reduceMotion]);

  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.5] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] });

  return (
    <View style={[authStyles.headerWrap, { marginBottom }]}>
      <View style={authStyles.brandBadgeWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
          authStyles.brandBadgeHalo,
          {
            borderColor: theme.primary,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }]
          }]
          } />

        <View
          style={[
          authStyles.brandBadge,
          {
            backgroundColor: theme.primary,
            shadowColor: theme.primary
          }]
          }>

          <Ionicons name={iconName} size={30} color="#FFFFFF" />
        </View>
      </View>

      <AppText variant="h1" style={[authStyles.brandTitle, { color: titleColor || theme.text }]}>
        {title}
      </AppText>

      {subtitle && tagSubtitle ?
      <View style={authStyles.brandTagRow}>
          <View style={[authStyles.brandTagDot, { backgroundColor: theme.accentOrange }]} />
          <AppText variant="small" style={[authStyles.brandTagText, { color: theme.textTertiary }]}>
            {subtitle}
          </AppText>
        </View> :
      null}

      {subtitle && !tagSubtitle ?
      <AppText variant="body" style={[authStyles.brandSubtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </AppText> :
      null}

      {children}
    </View>);

};

export default AuthHeader;